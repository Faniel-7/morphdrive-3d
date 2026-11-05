
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

import {
  HandLandmarker,
  FilesetResolver
} from '@mediapipe/tasks-vision';

// ============================================================
// ELEMENTS
// ============================================================

const video = document.querySelector('#webcam');
const container = document.querySelector('#three-container');
const startButton = document.querySelector('#start-camera');
const status = document.querySelector('#status');

if (!video || !container || !startButton || !status) {
  throw new Error(
    'Required elements missing: #webcam, #three-container, #start-camera, #status'
  );
}

video.muted = true;
video.playsInline = true;
video.style.opacity = '0';
video.style.pointerEvents = 'none';

// ============================================================
// SETTINGS
// ============================================================

const SETTINGS = {
  maxHands: 2,

  cameraZ: 35,
  cameraFov: 35,

  // Approximate model height in Three.js world units.
  modelHeight: 12,

  // Smoothing: higher = faster response, lower = smoother.
  positionSmooth: 0.28,
  rotationSmooth: 0.22,
  scaleSmooth: 0.18,
  landmarkSmooth: 0.42,
  boneSmooth: 0.38,

  // Keep the model inside the viewport.
  scaleMin: 0.45,
  scaleMax: 2.5
};

// ============================================================
// THREE.JS
// ============================================================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020711);

const camera = new THREE.PerspectiveCamera(
  SETTINGS.cameraFov,
  1,
  0.1,
  200
);

camera.position.set(0, 0, SETTINGS.cameraZ);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: 'low-power'
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.domElement.style.cssText = `
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
`;

container.innerHTML = '';
container.appendChild(renderer.domElement);

// ============================================================
// RESIZE
// ============================================================

function resize() {
  const rect = container.getBoundingClientRect();

  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height, false);
}

window.addEventListener('resize', resize);
resize();

// ============================================================
// MODEL / TRACKING STATE
// ============================================================

const loader = new GLTFLoader();

let originalHandScene = null;
let handModelReady = false;
let handLandmarker = null;
let cameraStream = null;

let running = false;
let lastVideoTime = -1;
let detectionFrame = null;

const handInstances = new Map();

const vectorY = new THREE.Vector3(0, 1, 0);

const cyanMaterial = new THREE.MeshBasicMaterial({
  color: 0x16cfff,
  wireframe: true,
  transparent: true,
  opacity: 0.95,
  side: THREE.DoubleSide,
  depthWrite: false
});

// ============================================================
// ACTUAL GLB BONE MAPPING
//
// Each entry:
// [bone name, child bone name, landmark start, landmark end]
//
// A null child means the final bone segment. Its rest direction
// is taken from that bone's local +Y axis.
// ============================================================

const FINGER_SEGMENTS = [
  // INDEX
  ['index_meta', 'index_prox', 0, 5],
  ['index_prox', 'index_midd', 5, 6],
  ['index_midd', 'index_dist', 6, 7],
  ['index_dist', null, 7, 8],

  // MIDDLE
  ['midd_meta', 'midd_prox', 0, 9],
  ['midd_prox', 'midd_midd', 9, 10],
  ['midd_midd', 'midd_dist', 10, 11],
  ['midd_dist', null, 11, 12],

  // RING
  ['ring_meta', 'ring_prox', 0, 13],
  ['ring_prox', 'ring_midd', 13, 14],
  ['ring_midd', 'ring_dist', 14, 15],
  ['ring_dist', null, 15, 16],

  // PINKY
  ['pinky_meta', 'pinky_prox', 0, 17],
  ['pinky_prox', 'pinky_midd', 17, 18],
  ['pinky_midd', 'pinky_dist', 18, 19],
  ['pinky_dist', null, 19, 20],

  // THUMB
  ['thumb_trapez', 'thumb_meta', 0, 1],
  ['thumb_meta', 'thumb_prox', 1, 2],
  ['thumb_prox', 'thumb_dist', 2, 3],
  ['thumb_dist', null, 3, 4]
];

const REQUIRED_BONES = [
  'radius_ulna',

  'index_meta',
  'index_prox',
  'index_midd',
  'index_dist',

  'midd_meta',
  'midd_prox',
  'midd_midd',
  'midd_dist',

  'ring_meta',
  'ring_prox',
  'ring_midd',
  'ring_dist',

  'pinky_meta',
  'pinky_prox',
  'pinky_midd',
  'pinky_dist',

  'thumb_trapez',
  'thumb_meta',
  'thumb_prox',
  'thumb_dist'
];

// ============================================================
// COORDINATE CONVERSION
// ============================================================

// MediaPipe world landmarks are measured in meters.
// We convert them into the camera-facing Three.js coordinate
// convention. X is mirrored for the selfie-style display;
// Y is inverted to make screen-up positive.
//
// Normalized image landmarks are NOT used for 3D rotation.

function worldPoint(point) {
  return new THREE.Vector3(
    -point.x,
    -point.y,
    -point.z
  );
}

function imagePoint(point) {
  return new THREE.Vector3(
    1 - point.x,
    1 - point.y,
    0
  );
}

function directionBetween(points, start, end) {
  return worldPoint(points[end])
    .sub(worldPoint(points[start]))
    .normalize();
}

function midpoint(points, indices) {
  const result = new THREE.Vector3();

  for (const index of indices) {
    result.add(imagePoint(points[index]));
  }

  return result.multiplyScalar(1 / indices.length);
}

// ============================================================
// BUILD A STABLE RIGHT-HANDED FRAME
// ============================================================

function makeFrame(across, up) {
  const xAxis = across.clone().normalize();

  const yAxis = up.clone()
    .addScaledVector(xAxis, -up.dot(xAxis))
    .normalize();

  const zAxis = new THREE.Vector3()
    .crossVectors(xAxis, yAxis)
    .normalize();

  const correctedY = new THREE.Vector3()
    .crossVectors(zAxis, xAxis)
    .normalize();

  const matrix = new THREE.Matrix4().makeBasis(
    xAxis,
    correctedY,
    zAxis
  );

  return new THREE.Quaternion().setFromRotationMatrix(matrix);
}

function getTargetPalmFrame(points) {
  const wrist = worldPoint(points[0]);
  const indexBase = worldPoint(points[5]);
  const middleBase = worldPoint(points[9]);
  const pinkyBase = worldPoint(points[17]);

  const across = pinkyBase.clone().sub(indexBase);
  const up = middleBase.clone().sub(wrist);

  return makeFrame(across, up);
}

// ============================================================
// CAMERA VIEW SIZE
// ============================================================

function getViewSize() {
  const height =
    2 *
    SETTINGS.cameraZ *
    Math.tan(THREE.MathUtils.degToRad(SETTINGS.cameraFov / 2));

  return {
    width: height * camera.aspect,
    height
  };
}

// ============================================================
// CREATE A HAND INSTANCE
// ============================================================

function createHandInstance(side) {
  if (!originalHandScene) return null;

  const root = new THREE.Group();
  root.visible = false;
  scene.add(root);

  const modelContainer = new THREE.Group();
  root.add(modelContainer);

  const model = SkeletonUtils.clone(originalHandScene);
  modelContainer.add(model);

  const bones = {};

  model.traverse((object) => {
    if (object.isBone) {
      bones[object.name] = object;
    }

    if (object.isMesh || object.isSkinnedMesh) {
      object.material = cyanMaterial.clone();
      object.frustumCulled = false;
    }
  });

  const missing = REQUIRED_BONES.filter((name) => !bones[name]);

  if (missing.length) {
    console.error(`${side} hand is missing bones:`, missing);
    root.removeFromParent();
    return null;
  }

  // Measure the original model before normalizing its size.
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());

  const largestDimension = Math.max(size.x, size.y, size.z);

  if (!Number.isFinite(largestDimension) || largestDimension <= 0) {
    console.error('Invalid hand model dimensions.');
    root.removeFromParent();
    return null;
  }

  const baseScale = SETTINGS.modelHeight / largestDimension;

  model.scale.setScalar(baseScale);
  model.position.set(
    -center.x * baseScale,
    -center.y * baseScale,
    -center.z * baseScale
  );

  // The downloaded model is the right-hand reference.
  // Mirror the model container for the left hand.
  // All rest-pose measurements below are taken AFTER this step.
  if (side === 'Left') {
    modelContainer.scale.x = -1;
  }

  root.updateMatrixWorld(true);

  // ----------------------------------------------------------
  // Capture rest-pose positions and orientations in root space.
  // ----------------------------------------------------------

  const inverseRootWorld = new THREE.Matrix4()
    .copy(root.matrixWorld)
    .invert();

  const rootWorldQuaternion = new THREE.Quaternion();
  root.getWorldQuaternion(rootWorldQuaternion);

  const inverseRootQuaternion = rootWorldQuaternion.clone().invert();

  function positionInRoot(object) {
    const position = new THREE.Vector3();
    object.getWorldPosition(position);
    return position.applyMatrix4(inverseRootWorld);
  }

  function quaternionInRoot(object) {
    const q = new THREE.Quaternion();
    object.getWorldQuaternion(q);

    return inverseRootQuaternion.clone().multiply(q);
  }

  const restBones = {};

  for (const [boneName, childName] of FINGER_SEGMENTS) {
    const bone = bones[boneName];
    const child = childName ? bones[childName] : null;

    const restPosition = positionInRoot(bone);
    const restQuaternion = quaternionInRoot(bone);

    let restDirection;

    if (child) {
      restDirection = positionInRoot(child)
        .sub(restPosition)
        .normalize();
    } else {
      // Terminal phalanx: use the bone's local +Y axis.
      restDirection = vectorY.clone()
        .applyQuaternion(restQuaternion)
        .normalize();
    }

    restBones[boneName] = {
      restQuaternion,
      restDirection,
      smoothedLocalQuaternion: bone.quaternion.clone()
    };
  }

  // Model palm frame based on the actual MCP positions.
  const wristPosition = positionInRoot(bones.radius_ulna);
  const indexPosition = positionInRoot(bones.index_prox);
  const middlePosition = positionInRoot(bones.midd_prox);
  const pinkyPosition = positionInRoot(bones.pinky_prox);

  const modelAcross = pinkyPosition.clone().sub(indexPosition);
  const modelUp = middlePosition.clone().sub(wristPosition);

  const restPalmFrame = makeFrame(modelAcross, modelUp);

  const restPalmWidth = indexPosition.distanceTo(pinkyPosition);

  const instance = {
    side,
    root,
    model,
    modelContainer,
    bones,
    restBones,
    restPalmFrame,
    restPalmWidth,

    smoothedWorldLandmarks: null,

    positionReady: false,
    rotationReady: false,
    scaleReady: false,

    position: new THREE.Vector3(),
    rotation: new THREE.Quaternion(),
    scale: 1,

    lastSeen: performance.now()
  };

  handInstances.set(side, instance);

  console.log(`${side} hand rig created.`, {
    modelSize: size,
    restPalmWidth,
    boneCount: Object.keys(bones).length
  });

  return instance;
}

// ============================================================
// LOAD THE GLB
// ============================================================

status.textContent = 'Loading 3D hand model...';

loader.load(
  '/models/hand/hand.glb',

  (gltf) => {
    originalHandScene = gltf.scene;
    handModelReady = true;

    status.textContent = '3D hand model ready. Start the camera.';

    console.log('Hand GLB loaded successfully.');
  },

  undefined,

  (error) => {
    console.error('Could not load hand.glb:', error);
    status.textContent = 'ERROR: Could not load hand.glb.';
  }
);

// ============================================================
// LANDMARK SMOOTHING
// ============================================================

function smoothWorldLandmarks(instance, input) {
  if (!input || input.length !== 21) return null;

  if (!instance.smoothedWorldLandmarks) {
    instance.smoothedWorldLandmarks = input.map((point) => ({
      x: point.x,
      y: point.y,
      z: point.z
    }));

    return instance.smoothedWorldLandmarks;
  }

  for (let i = 0; i < 21; i++) {
    const current = instance.smoothedWorldLandmarks[i];
    const target = input[i];

    current.x +=
      (target.x - current.x) * SETTINGS.landmarkSmooth;

    current.y +=
      (target.y - current.y) * SETTINGS.landmarkSmooth;

    current.z +=
      (target.z - current.z) * SETTINGS.landmarkSmooth;
  }

  return instance.smoothedWorldLandmarks;
}

// ============================================================
// PALM ROTATION
// ============================================================

function updatePalmRotation(instance, worldLandmarks) {
  const targetFrame = getTargetPalmFrame(worldLandmarks);

  // qTarget = qObservedPalm * inverse(qModelRestPalm)
  const targetRotation = targetFrame.multiply(
    instance.restPalmFrame.clone().invert()
  );

  if (!instance.rotationReady) {
    instance.rotation.copy(targetRotation);
    instance.rotationReady = true;
  } else {
    instance.rotation.slerp(
      targetRotation,
      SETTINGS.rotationSmooth
    );
  }

  instance.root.quaternion.copy(instance.rotation);
}

// ============================================================
// FINGER RETARGETING
// ============================================================

function updateFingerBone(
  instance,
  boneName,
  startIndex,
  endIndex,
  worldLandmarks
) {
  const bone = instance.bones[boneName];
  const rest = instance.restBones[boneName];

  if (!bone || !rest) return;

  // Target segment in MediaPipe's 3D world coordinate space.
  const targetDirectionWorld = directionBetween(
    worldLandmarks,
    startIndex,
    endIndex
  );

  if (
    !Number.isFinite(targetDirectionWorld.x) ||
    targetDirectionWorld.lengthSq() < 0.000001
  ) {
    return;
  }

  // Convert target direction into the hand root's local space.
  const targetDirectionRoot = targetDirectionWorld
    .clone()
    .applyQuaternion(instance.root.quaternion.clone().invert())
    .normalize();

  // Find the rotation that takes this bone's REST segment
  // direction to the target segment direction.
  const deltaRoot = new THREE.Quaternion()
    .setFromUnitVectors(
      rest.restDirection,
      targetDirectionRoot
    );

  // Desired bone orientation in hand-root coordinates.
  const desiredBoneWorldRoot = deltaRoot.multiply(
    rest.restQuaternion.clone()
  );

  // Convert desired root-space orientation into the bone's
  // local coordinate space using its CURRENT parent orientation.
  instance.root.updateMatrixWorld(true);

  const rootWorldQuaternion = new THREE.Quaternion();
  instance.root.getWorldQuaternion(rootWorldQuaternion);

  const parentWorldQuaternion = new THREE.Quaternion();
  bone.parent.getWorldQuaternion(parentWorldQuaternion);

  const parentRootQuaternion = rootWorldQuaternion
    .invert()
    .multiply(parentWorldQuaternion);

  const desiredLocalQuaternion = parentRootQuaternion
    .invert()
    .multiply(desiredBoneWorldRoot);

  // Smooth each bone independently.
  rest.smoothedLocalQuaternion.slerp(
    desiredLocalQuaternion,
    SETTINGS.boneSmooth
  );

  bone.quaternion.copy(rest.smoothedLocalQuaternion);

  // Update before calculating the next child bone.
  instance.root.updateMatrixWorld(true);
}

function updateAllFingerBones(instance, worldLandmarks) {
  for (const [
    boneName,
    childName,
    startIndex,
    endIndex
  ] of FINGER_SEGMENTS) {
    updateFingerBone(
      instance,
      boneName,
      startIndex,
      endIndex,
      worldLandmarks
    );
  }
}

// ============================================================
// SCREEN POSITION AND MODEL SCALE
// ============================================================

function updateScreenPosition(instance, imageLandmarks) {
  const center = midpoint(imageLandmarks, [0, 5, 9, 13, 17]);
  const view = getViewSize();

  // Webcam image is displayed as a mirrored selfie view.
  const targetPosition = new THREE.Vector3(
    (center.x - 0.5) * view.width,
    (center.y - 0.5) * view.height,
    0
  );

  if (!instance.positionReady) {
    instance.position.copy(targetPosition);
    instance.positionReady = true;
  } else {
    instance.position.lerp(
      targetPosition,
      SETTINGS.positionSmooth
    );
  }

  instance.root.position.copy(instance.position);

  // Measure palm width in screen/world units.
  const dx =
    (imageLandmarks[5].x - imageLandmarks[17].x) *
    view.width;

  const dy =
    (imageLandmarks[5].y - imageLandmarks[17].y) *
    view.height;

  const targetPalmWidth = Math.sqrt(dx * dx + dy * dy);

  const targetScale = THREE.MathUtils.clamp(
    targetPalmWidth / Math.max(instance.restPalmWidth, 0.001),
    SETTINGS.scaleMin,
    SETTINGS.scaleMax
  );

  if (!instance.scaleReady) {
    instance.scale = targetScale;
    instance.scaleReady = true;
  } else {
    instance.scale +=
      (targetScale - instance.scale) * SETTINGS.scaleSmooth;
  }

  instance.root.scale.setScalar(instance.scale);
}

// ============================================================
// UPDATE A DETECTED HAND
// ============================================================

function updateTrackedHand(side, imageLandmarks, rawWorldLandmarks) {
  let instance = handInstances.get(side);

  if (!instance) {
    instance = createHandInstance(side);
  }

  if (!instance) return;

  const worldLandmarks = smoothWorldLandmarks(
    instance,
    rawWorldLandmarks
  );

  if (!worldLandmarks) return;

  instance.lastSeen = performance.now();

  instance.root.visible = true;

  // 1. Position the whole hand.
  updateScreenPosition(instance, imageLandmarks);

  // 2. Rotate the palm to match the 3D palm frame.
  updatePalmRotation(instance, worldLandmarks);

  // 3. Retarget the fingers from their actual 3D segments.
  updateAllFingerBones(instance, worldLandmarks);

  instance.root.updateMatrixWorld(true);
}

// ============================================================
// MEDIAPIPE INITIALIZATION
// ============================================================

async function initializeMediaPipe() {
  status.textContent = 'Initializing MediaPipe...';

  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm'
  );

  handLandmarker = await HandLandmarker.createFromOptions(
    vision,
    {
      baseOptions: {
        modelAssetPath: '/models/mediapipe/hand_landmarker.task',
        delegate: 'CPU'
      },

      runningMode: 'VIDEO',
      numHands: SETTINGS.maxHands,

      minHandDetectionConfidence: 0.6,
      minHandPresenceConfidence: 0.6,
      minTrackingConfidence: 0.6
    }
  );

  console.log('MediaPipe ready. Maximum hands:', SETTINGS.maxHands);
}

// ============================================================
// START CAMERA
// ============================================================

async function startCamera() {
  if (running) return;

  try {
    startButton.disabled = true;

    if (!handModelReady) {
      status.textContent = 'Please wait for the 3D model to load.';
      startButton.disabled = false;
      return;
    }

    if (!handLandmarker) {
      await initializeMediaPipe();
    }

    status.textContent = 'Requesting webcam permission...';

    cameraStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 24, max: 30 }
      }
    });

    video.srcObject = cameraStream;

    await new Promise((resolve) => {
      if (video.readyState >= 2) {
        resolve();
      } else {
        video.onloadeddata = () => resolve();
      }
    });

    await video.play();

    running = true;
    lastVideoTime = -1;

    startButton.style.display = 'none';

    status.textContent = 'Show your hand to the camera.';

    detectHands();

  } catch (error) {
    console.error('Could not start hand tracking:', error);

    status.textContent = `Camera error: ${error.message}`;

    startButton.disabled = false;
  }
}

// ============================================================
// DETECTION LOOP
// ============================================================

function getHandSide(result, index) {
  // Current Web API exposes handednesses.
  // The fallback supports builds that expose handedness.
  const classifications =
    result.handednesses || result.handedness;

  const classification = classifications?.[index]?.[0];

  if (!classification) return null;

  // Do not swap labels: our video input is not mirrored.
  return classification.categoryName;
}

function detectHands() {
  if (!running) return;

  if (
    video.readyState >= 2 &&
    video.currentTime !== lastVideoTime
  ) {
    lastVideoTime = video.currentTime;

    const result = handLandmarker.detectForVideo(
      video,
      performance.now()
    );

    const visibleSides = new Set();

    const imageResults = result.landmarks || [];
    const worldResults = result.worldLandmarks || [];

    for (let i = 0; i < imageResults.length; i++) {
      const side = getHandSide(result, i);

      if (side !== 'Left' && side !== 'Right') continue;

      const imageLandmarks = imageResults[i];
      const worldLandmarks = worldResults[i];

      if (!imageLandmarks || !worldLandmarks) continue;

      visibleSides.add(side);

      updateTrackedHand(
        side,
        imageLandmarks,
        worldLandmarks
      );
    }

    for (const [side, instance] of handInstances) {
      instance.root.visible = visibleSides.has(side);
    }

    if (visibleSides.size === 2) {
      status.textContent = 'BOTH HANDS DETECTED';
    } else if (visibleSides.size === 1) {
      status.textContent =
        `${[...visibleSides][0].toUpperCase()} HAND DETECTED`;
    } else {
      status.textContent = 'SHOW YOUR HANDS TO THE CAMERA';
    }
  }

  detectionFrame = requestAnimationFrame(detectHands);
}

// ============================================================
// RENDER LOOP
// ============================================================

function render() {
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

render();

// ============================================================
// EVENTS
// ============================================================

startButton.addEventListener('click', startCamera);

// ============================================================
// CLEANUP
// ============================================================

window.addEventListener('pagehide', () => {
  running = false;

  if (detectionFrame !== null) {
    cancelAnimationFrame(detectionFrame);
  }

  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
  }

  if (handLandmarker) {
    handLandmarker.close();
  }

  for (const instance of handInstances.values()) {
    instance.root.removeFromParent();

    instance.model.traverse((object) => {
      if (object.material && object.material !== cyanMaterial) {
        object.material.dispose();
      }
    });
  }

  renderer.dispose();
});
