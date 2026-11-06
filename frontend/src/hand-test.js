import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

// ============================================================
// MORPHDRIVE 3D — HAND TRACKING
// Anatomical GLB + cyan holographic wireframe.
// ============================================================

const video = document.querySelector('#webcam');
const container = document.querySelector('#three-container');
const startButton = document.querySelector('#start-camera');
const status = document.querySelector('#status');

if (!video || !container || !startButton || !status) {
  throw new Error('Missing required HTML elements for hand tracking.');
}

video.muted = true;
video.playsInline = true;
video.style.opacity = '0';
video.style.pointerEvents = 'none';

const SETTINGS = {
  maxHands: 2,
  cameraZ: 35,
  cameraFov: 35,
  modelHeight: 12,

  // Exponential smoothing time constants, in seconds.
  positionTime: 0.045,
  rotationTime: 0.055,
  landmarkTime: 0.025,
  boneTime: 0.035,
  scaleTime: 0.075,

  scaleMin: 0.45,
  scaleMax: 2.5,

  // Cap CPU detection near 25 Hz.
  detectionInterval: 40,

  // Lightweight settings for Intel HD 5500.
  pixelRatio: 1,
  renderMaxFps: 60,

  lostHandGraceMs: 220,

  // Keep the model inside the viewport.
  viewportMargin: 0.06,

  // Keep enabled while we diagnose camera framing.
  showCameraPreview: true
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020711);

const camera = new THREE.PerspectiveCamera(
  SETTINGS.cameraFov, 1, 0.1, 200
);
camera.position.set(0, 0, SETTINGS.cameraZ);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
  antialias: false,
  alpha: false,
  powerPreference: 'low-power'
});

renderer.setPixelRatio(
  Math.min(window.devicePixelRatio || 1, SETTINGS.pixelRatio)
);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.style.cssText =
  'position:absolute;inset:0;display:block;width:100%;height:100%;';

container.replaceChildren(renderer.domElement);

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
// CAMERA PREVIEW
// ============================================================

let previewCanvas = null;
let previewContext = null;
let previewWrapper = null;
let latestImageLandmarks = [];
let lastPreviewDraw = 0;

function createCameraPreview() {
  if (!SETTINGS.showCameraPreview || previewWrapper) return;

  previewWrapper = document.createElement('div');
  previewWrapper.id = 'morphdrive-camera-preview';

  previewWrapper.style.cssText = [
    'position:fixed',
    'right:16px',
    'bottom:16px',
    'width:240px',
    'aspect-ratio:4/3',
    'z-index:9999',
    'overflow:hidden',
    'border:1px solid rgba(22,207,255,.65)',
    'border-radius:10px',
    'background:#020711',
    'box-shadow:0 0 22px rgba(0,180,255,.16)',
    'pointer-events:none'
  ].join(';');

  const previewLabel = document.createElement('div');
  previewLabel.textContent = 'LIVE CAMERA • MIRRORED';

  previewLabel.style.cssText = [
    'position:absolute',
    'z-index:2',
    'top:0',
    'left:0',
    'right:0',
    'padding:6px 8px',
    'font:10px/1.2 monospace',
    'letter-spacing:.08em',
    'color:#7eeaff',
    'background:rgba(2,7,17,.72)'
  ].join(';');

  video.style.cssText = [
    'position:absolute',
    'inset:0',
    'width:100%',
    'height:100%',
    'object-fit:cover',
    'transform:scaleX(-1)',
    'opacity:1',
    'display:block',
    'pointer-events:none'
  ].join(';');

  previewCanvas = document.createElement('canvas');
  previewCanvas.width = 640;
  previewCanvas.height = 480;

  previewCanvas.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;';

  previewContext = previewCanvas.getContext('2d');

  previewWrapper.append(video, previewCanvas, previewLabel);
  document.body.appendChild(previewWrapper);
}

function drawCameraPreview(now = 0) {
  if (!previewContext || !previewCanvas) return;
  if (now - lastPreviewDraw < 45) return;

  lastPreviewDraw = now;

  const ctx = previewContext;
  ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

  ctx.save();

  // Camera guide.
  ctx.strokeStyle = 'rgba(85,220,255,.45)';
  ctx.lineWidth = 2;
  ctx.setLineDash([9, 8]);
  ctx.strokeRect(32, 48, 576, 392);
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(100,220,255,.7)';
  ctx.font = '16px monospace';
  ctx.fillText('KEEP HANDS INSIDE FRAME', 42, 70);

  const connections = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [0,9],[9,10],[10,11],[11,12],
    [0,13],[13,14],[14,15],[15,16],
    [0,17],[17,18],[18,19],[19,20],
    [5,9],[9,13],[13,17]
  ];

  for (const hand of latestImageLandmarks) {
    ctx.strokeStyle = 'rgba(22,207,255,.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();

    for (const [a, b] of connections) {
      const ax = (1 - hand[a].x) * previewCanvas.width;
      const ay = hand[a].y * previewCanvas.height;
      const bx = (1 - hand[b].x) * previewCanvas.width;
      const by = hand[b].y * previewCanvas.height;

      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
    }

    ctx.stroke();
    ctx.fillStyle = '#baf7ff';

    for (const point of hand) {
      ctx.beginPath();
      ctx.arc(
        (1 - point.x) * previewCanvas.width,
        point.y * previewCanvas.height,
        4,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }

  ctx.restore();
}

const cyanMaterial = new THREE.MeshBasicMaterial({
  color: 0x16cfff,
  wireframe: true,
  transparent: true,
  opacity: 0.95,
  side: THREE.DoubleSide,
  depthWrite: false
});

const loader = new GLTFLoader();

let originalHandScene = null;
let handModelReady = false;
let handLandmarker = null;
let cameraStream = null;

let running = false;
let detectionBusy = false;

let lastDetectionTime = -Infinity;
let lastVideoTime = -1;
let lastRenderTime = 0;

let renderFrame = null;
let detectionFrame = null;

const handInstances = new Map();

createCameraPreview();

// ============================================================
// HAND RIG MAP
// ============================================================

const FINGER_SEGMENTS = [
  ['index_meta', 0, 5],
  ['index_prox', 5, 6],
  ['index_midd', 6, 7],
  ['index_dist', 7, 8],

  ['midd_meta', 0, 9],
  ['midd_prox', 9, 10],
  ['midd_midd', 10, 11],
  ['midd_dist', 11, 12],

  ['ring_meta', 0, 13],
  ['ring_prox', 13, 14],
  ['ring_midd', 14, 15],
  ['ring_dist', 15, 16],

  ['pinky_meta', 0, 17],
  ['pinky_prox', 17, 18],
  ['pinky_midd', 18, 19],
  ['pinky_dist', 19, 20],

  ['thumb_trapez', 0, 1],
  ['thumb_meta', 1, 2],
  ['thumb_prox', 2, 3],
  ['thumb_dist', 3, 4]
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

const V3_Y = new THREE.Vector3(0, 1, 0);

const _vA = new THREE.Vector3();
const _vB = new THREE.Vector3();
const _vC = new THREE.Vector3();

const _qA = new THREE.Quaternion();
const _qB = new THREE.Quaternion();

const _mA = new THREE.Matrix4();

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function smoothingAlpha(deltaSeconds, timeConstant) {
  if (timeConstant <= 0) return 1;

  return 1 - Math.exp(
    -Math.max(0, deltaSeconds) / timeConstant
  );
}

function validVector(v) {
  return Number.isFinite(v.x) &&
    Number.isFinite(v.y) &&
    Number.isFinite(v.z) &&
    v.lengthSq() > 1e-10;
}

// ============================================================
// COORDINATE CONVERSION
// ============================================================

// Convert MediaPipe world coordinates into the Three.js convention.
function worldPoint(point) {
  // Convert MediaPipe coordinates to Three.js using a proper
  // rotation (determinant +1), not a three-axis reflection.
  return new THREE.Vector3(
    -point.x,
    -point.y,
    point.z
  );
}

function imageCenter(landmarks) {
  // Palm anchor: wrist plus the four MCP joints.
  // X is mirrored for selfie-style display.
  // Y is inverted once because image coordinates grow downward.
  const ids = [0, 5, 9, 13, 17];
  const center = new THREE.Vector2();

  for (const id of ids) {
    center.x += 1 - landmarks[id].x;
    center.y += 1 - landmarks[id].y;
  }

  return center.multiplyScalar(1 / ids.length);
}

function directionBetween(
  points,
  start,
  end,
  target = new THREE.Vector3()
) {
  const a = worldPoint(points[start]);
  const b = worldPoint(points[end]);

  target.subVectors(b, a);

  if (target.lengthSq() > 1e-10) {
    target.normalize();
  }

  return target;
}

// ============================================================
// PALM ORIENTATION
// ============================================================

function makeFrame(across, up, previousQuaternion = null) {
  const xAxis = across.clone();
  const yInput = up.clone();

  if (!validVector(xAxis) || !validVector(yInput)) {
    return null;
  }

  xAxis.normalize();

  const yAxis = yInput.addScaledVector(
    xAxis,
    -yInput.dot(xAxis)
  );

  // Edge-on hands can make these axes nearly parallel.
  // Reject unreliable frames instead of producing sudden rotations.
  if (yAxis.lengthSq() < 2.5e-3) {
    return null;
  }

  yAxis.normalize();

  const zAxis = new THREE.Vector3().crossVectors(
    xAxis,
    yAxis
  );

  if (zAxis.lengthSq() < 2.5e-3) {
    return null;
  }

  zAxis.normalize();

  const correctedY = new THREE.Vector3()
    .crossVectors(zAxis, xAxis)
    .normalize();

  const matrix = new THREE.Matrix4().makeBasis(
    xAxis,
    correctedY,
    zAxis
  );

  const result = new THREE.Quaternion()
    .setFromRotationMatrix(matrix)
    .normalize();

  // q and -q represent the same rotation.
  // Keep quaternion interpolation continuous.
  if (previousQuaternion && result.dot(previousQuaternion) < 0) {
    result.set(
      -result.x,
      -result.y,
      -result.z,
      -result.w
    );
  }

  return result;
}

function getObservedPalmFrame(points, previousQuaternion) {
  const wrist = worldPoint(points[0]);
  const indexBase = worldPoint(points[5]);
  const middleBase = worldPoint(points[9]);
  const pinkyBase = worldPoint(points[17]);

  const across = pinkyBase.sub(indexBase);
  const up = middleBase.sub(wrist);

  return makeFrame(
    across,
    up,
    previousQuaternion
  );
}

function getViewSize() {
  const height = 2 * SETTINGS.cameraZ *
    Math.tan(
      THREE.MathUtils.degToRad(SETTINGS.cameraFov / 2)
    );

  return {
    width: height * camera.aspect,
    height
  };
}

// ============================================================
// CREATE A TRACKED HAND
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

  const missing = REQUIRED_BONES.filter(
    (name) => !bones[name]
  );

  if (missing.length) {
    console.error(
      `${side} hand model is missing bones:`,
      missing
    );

    root.removeFromParent();
    return null;
  }

  // Normalize the downloaded model.
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());

  const largestDimension = Math.max(
    size.x,
    size.y,
    size.z
  );

  if (
    !Number.isFinite(largestDimension) ||
    largestDimension <= 0
  ) {
    console.error('Invalid hand GLB dimensions.');
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

  // The source GLB is a right-hand reference.
  // Reflect only the left-hand copy.
  if (side === 'Left') {
    modelContainer.scale.x = -1;
  }

  root.updateMatrixWorld(true);

  // ==========================================================
  // SAVE REST-POSE BONE DIRECTIONS
  // ==========================================================

  const restBones = {};

  for (const [boneName, startIndex, endIndex] of FINGER_SEGMENTS) {
    const bone = bones[boneName];

    const segmentIndex = FINGER_SEGMENTS.findIndex(
      (entry) => entry[0] === boneName
    );

    const following = FINGER_SEGMENTS[segmentIndex + 1];

    const fingerGroup =
      boneName.startsWith('midd_') ? 'midd' :
      boneName.startsWith('index_') ? 'index' :
      boneName.startsWith('ring_') ? 'ring' :
      boneName.startsWith('pinky_') ? 'pinky' :
      'thumb';

    const isTerminal = boneName.endsWith('_dist');

    let restDirectionLocal;

    if (
      !isTerminal &&
      following &&
      following[0].startsWith(fingerGroup + '_')
    ) {
      const childBone = bones[following[0]];

      const boneWorld = bone.matrixWorld.clone().invert();

      const childWorldPosition = new THREE.Vector3();
      childBone.getWorldPosition(childWorldPosition);

      const childLocalPosition =
        childWorldPosition.applyMatrix4(boneWorld);

      restDirectionLocal = childLocalPosition.normalize();
    } else {
      // Terminal phalanx direction follows the model's local +Y axis.
      restDirectionLocal = V3_Y.clone();
    }

    restBones[boneName] = {
      restQuaternion: bone.quaternion.clone(),
      restDirectionLocal: restDirectionLocal.clone(),
      smoothedQuaternion: bone.quaternion.clone(),
      initialized: false,
      startIndex,
      endIndex
    };
  }

  // ==========================================================
  // PALM-CENTRED MODEL ALIGNMENT
  // ==========================================================

  const rootInverse = root.matrixWorld.clone().invert();

  const rootPoint = (object) => {
    const p = new THREE.Vector3();

    object.getWorldPosition(p);

    return p.applyMatrix4(rootInverse);
  };

  const wristPosition = rootPoint(bones.radius_ulna);
  const indexPosition = rootPoint(bones.index_prox);
  const middlePosition = rootPoint(bones.midd_prox);
  const ringPosition = rootPoint(bones.ring_prox);
  const pinkyPosition = rootPoint(bones.pinky_prox);

  // The tracked screen point is the palm anchor:
  // wrist + four MCP joints.
  //
  // The model's bounding-box centre is NOT the palm centre.
  // Move the model so the palm anchor becomes the root origin.
  const palmAnchor = wristPosition.clone()
    .add(indexPosition)
    .add(middlePosition)
    .add(ringPosition)
    .add(pinkyPosition)
    .multiplyScalar(0.2);

  modelContainer.position.sub(palmAnchor);

  root.updateMatrixWorld(true);

  // Re-read the anchor-relative positions after moving the model.
  const anchoredRootInverse = root.matrixWorld.clone().invert();

  const anchoredPoint = (object) => {
    const p = new THREE.Vector3();

    object.getWorldPosition(p);

    return p.applyMatrix4(anchoredRootInverse);
  };

  const anchoredWrist = anchoredPoint(bones.radius_ulna);
  const anchoredIndex = anchoredPoint(bones.index_prox);
  const anchoredMiddle = anchoredPoint(bones.midd_prox);
  const anchoredPinky = anchoredPoint(bones.pinky_prox);

  const restPalmFrame = makeFrame(
    anchoredPinky.clone().sub(anchoredIndex),
    anchoredMiddle.clone().sub(anchoredWrist)
  );

  if (!restPalmFrame) {
    console.error(
      `Could not establish ${side} model palm frame.`
    );

    root.removeFromParent();
    return null;
  }

  const restPalmWidth = anchoredIndex.distanceTo(
    anchoredPinky
  );

  const anchoredBounds = new THREE.Box3().setFromObject(model);
  const anchoredSize = anchoredBounds.getSize(
    new THREE.Vector3()
  );

  const handRadius = Math.max(
    anchoredSize.x,
    anchoredSize.y,
    anchoredSize.z
  ) * 0.5;

  const instance = {
    side,
    root,
    model,
    modelContainer,
    bones,
    restBones,

    restPalmFrame,
    restPalmWidth,
    handRadius,

    smoothedWorld: null,
    lastObservedFrame: null,

    position: new THREE.Vector3(),
    rotation: new THREE.Quaternion(),

    scale: 1,

    positionReady: false,
    rotationReady: false,
    scaleReady: false,

    lastSeen: 0
  };

  handInstances.set(side, instance);

  console.info(`${side} hand rig ready`, {
    bones: Object.keys(bones).length,
    restPalmWidth,
    modelSize: size
  });

  return instance;
}

// ============================================================
// LANDMARK SMOOTHING
// ============================================================

function smoothWorldLandmarks(instance, input, dt) {
  if (!input || input.length !== 21) {
    return null;
  }

  if (!instance.smoothedWorld) {
    instance.smoothedWorld = input.map((p) => ({
      x: p.x,
      y: p.y,
      z: p.z
    }));

    return instance.smoothedWorld;
  }

  const alpha = smoothingAlpha(
    dt,
    SETTINGS.landmarkTime
  );

  for (let i = 0; i < 21; i++) {
    const current = instance.smoothedWorld[i];
    const target = input[i];

    current.x += (target.x - current.x) * alpha;
    current.y += (target.y - current.y) * alpha;
    current.z += (target.z - current.z) * alpha;
  }

  return instance.smoothedWorld;
}

// ============================================================
// ============================================================
// HAND POSITION AND SCALE
// ============================================================

function updateHandPosition(instance, imageLandmarks, dt) {
  const center = imageCenter(imageLandmarks);
  const view = getViewSize();

  // Map the palm anchor directly to the camera view.
  // Do not clamp by the complete 3D hand radius:
  // that reduces the movement range and can pull two hands
  // toward the centre when they are far apart.
  const target = new THREE.Vector3(
    (center.x - 0.5) * view.width,
    (center.y - 0.5) * view.height,
    0
  );

  // Estimate real palm width from the MCP landmarks.
  const dx =
    (imageLandmarks[5].x - imageLandmarks[17].x) *
    view.width;

  const dy =
    (imageLandmarks[5].y - imageLandmarks[17].y) *
    view.height;

  const observedPalmWidth = Math.hypot(dx, dy);

  const targetScale = THREE.MathUtils.clamp(
    observedPalmWidth /
      Math.max(instance.restPalmWidth, 0.001),
    SETTINGS.scaleMin,
    SETTINGS.scaleMax
  );

  if (!instance.scaleReady) {
    instance.scale = targetScale;
    instance.scaleReady = true;
  } else {
    instance.scale +=
      (targetScale - instance.scale) *
      smoothingAlpha(dt, SETTINGS.scaleTime);
  }

  if (!instance.positionReady) {
    instance.position.copy(target);
    instance.positionReady = true;
  } else {
    instance.position.lerp(
      target,
      smoothingAlpha(dt, SETTINGS.positionTime)
    );
  }

  instance.root.position.copy(instance.position);
  instance.root.scale.setScalar(instance.scale);
}

// ============================================================
// PALM ROTATION
// ============================================================

function updatePalmRotation(instance, worldLandmarks, dt) {
  const observedFrame = getObservedPalmFrame(
    worldLandmarks,
    instance.lastObservedFrame ||
      (instance.rotationReady ? instance.rotation : null)
  );

  // If the palm is too edge-on, keep the last reliable orientation.
  if (!observedFrame) return;

  if (
    instance.lastObservedFrame &&
    observedFrame.dot(instance.lastObservedFrame) < 0
  ) {
    observedFrame.set(
      -observedFrame.x,
      -observedFrame.y,
      -observedFrame.z,
      -observedFrame.w
    );
  }

  instance.lastObservedFrame = observedFrame.clone();

  const targetRotation = observedFrame.multiply(
    instance.restPalmFrame.clone().invert()
  ).normalize();

  if (!instance.rotationReady) {
    instance.rotation.copy(targetRotation);
    instance.rotationReady = true;
  } else {
    // Slightly slower orientation filtering helps when the palm
    // is viewed edge-on and its landmarks become less stable.
    instance.rotation.slerp(
      targetRotation,
      smoothingAlpha(
        dt,
        SETTINGS.rotationTime * 1.35
      )
    );
  }

  instance.root.quaternion.copy(instance.rotation);
}

// ============================================================
// FINGER BONE RETARGETING
// ============================================================

// Retarget each bone using its parent's inverse WORLD MATRIX.
// This avoids decomposing a world quaternion beneath a reflected
// left-hand model, where a negative scale can cause problems.

function updateFingerBone(
  instance,
  boneName,
  start,
  end,
  points,
  dt
) {
  const bone = instance.bones[boneName];
  const rest = instance.restBones[boneName];

  if (!bone || !rest || !bone.parent) return;

  const targetWorldDirection = directionBetween(
    points,
    start,
    end,
    _vA
  );

  if (!validVector(targetWorldDirection)) return;

  // Convert the observed direction into the current parent's
  // local coordinate system.
  bone.parent.updateWorldMatrix(true, false);

  const parentInverse = _mA.copy(
    bone.parent.matrixWorld
  ).invert();

  const targetParentDirection = _vB
    .copy(targetWorldDirection)
    .transformDirection(parentInverse)
    .normalize();

  // Rest direction in the parent's local coordinate system.
  const restParentDirection = _vC
    .copy(rest.restDirectionLocal)
    .applyQuaternion(rest.restQuaternion)
    .normalize();

  if (
    !validVector(targetParentDirection) ||
    !validVector(restParentDirection)
  ) {
    return;
  }

  // Rotate the rest direction onto the measured direction.
  const swing = _qA.setFromUnitVectors(
    restParentDirection,
    targetParentDirection
  );

  const desiredLocal = _qB
    .copy(swing)
    .multiply(rest.restQuaternion);

  if (!rest.initialized) {
    rest.smoothedQuaternion.copy(desiredLocal);
    rest.initialized = true;
  } else {
    rest.smoothedQuaternion.slerp(
      desiredLocal,
      smoothingAlpha(dt, SETTINGS.boneTime)
    );
  }

  bone.quaternion.copy(rest.smoothedQuaternion);
  bone.updateMatrix();
  bone.updateWorldMatrix(false, true);
}

function updateAllFingerBones(instance, points, dt) {
  // Parent segments are processed before their child segments.
  for (const [boneName, start, end] of FINGER_SEGMENTS) {
    updateFingerBone(
      instance,
      boneName,
      start,
      end,
      points,
      dt
    );
  }
}

// ============================================================
// UPDATE ONE TRACKED HAND
// ============================================================

function updateTrackedHand(
  side,
  imageLandmarks,
  worldLandmarks,
  dt,
  now
) {
  let instance = handInstances.get(side);

  if (!instance) {
    instance = createHandInstance(side);
  }

  if (!instance) return;

  const smoothed = smoothWorldLandmarks(
    instance,
    worldLandmarks,
    dt
  );

  if (!smoothed) return;

  instance.lastSeen = now;
  instance.root.visible = true;

  updateHandPosition(
    instance,
    imageLandmarks,
    dt
  );

  updatePalmRotation(
    instance,
    smoothed,
    dt
  );

  // Update the root before retargeting individual finger bones.
  instance.root.updateMatrixWorld(true);

  updateAllFingerBones(
    instance,
    smoothed,
    dt
  );

  instance.root.updateMatrixWorld(true);
}

// ============================================================

// ============================================================
// HANDEDNESS
// ============================================================

// The webcam video sent to MediaPipe is unmirrored.
// The camera preview is mirrored using CSS.
// Therefore, swap MediaPipe's handedness label for the
// mirrored 3D presentation.
function readHandSide(result, index) {
  const category =
    result.handednesses?.[index]?.[0]?.categoryName ??
    result.handedness?.[index]?.[0]?.categoryName;

  if (category === 'Left') return 'Right';
  if (category === 'Right') return 'Left';

  return null;
}

// ============================================================
// INITIALIZE 3D HAND MODEL
// ============================================================

async function loadHandModel() {
  if (handModelReady) return;

  status.textContent = 'Loading 3D hand model...';

  const gltf = await loader.loadAsync(
    '/models/hand/hand.glb'
  );

  originalHandScene = gltf.scene;
  handModelReady = true;

  console.info('3D hand model loaded.');
}

// ============================================================
// INITIALIZE MEDIAPIPE
// ============================================================

async function initializeHandLandmarker() {
  if (handLandmarker) return;

  status.textContent = 'Initializing hand tracking...';

  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm'
  );

  handLandmarker = await HandLandmarker.createFromOptions(
    vision,
    {
      baseOptions: {
        modelAssetPath:
          '/models/mediapipe/hand_landmarker.task',

        // CPU is the safer fallback for this laptop's
        // older integrated graphics.
        delegate: 'CPU'
      },

      runningMode: 'VIDEO',
      numHands: SETTINGS.maxHands,

      minHandDetectionConfidence: 0.55,
      minHandPresenceConfidence: 0.55,
      minTrackingConfidence: 0.55
    }
  );

  console.info('MediaPipe hand tracker initialized.');
}

// ============================================================
// CAMERA
// ============================================================

async function startCamera() {
  if (cameraStream) return;

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(
      'Camera access is unavailable. Use localhost or HTTPS.'
    );
  }

  cameraStream = await navigator.mediaDevices.getUserMedia({
    audio: false,

    video: {
      facingMode: 'user',
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 30, max: 30 }
    }
  });

  video.srcObject = cameraStream;

  await video.play();

  if (SETTINGS.showCameraPreview) {
    createCameraPreview();
  }

  console.info('Camera started.');
}

// ============================================================
// UPDATE TRACKING STATUS
// ============================================================

function updateTrackingStatus(now) {
  let trackedCount = 0;

  for (const instance of handInstances.values()) {
    const age = now - instance.lastSeen;

    if (age <= SETTINGS.lostHandGraceMs) {
      trackedCount++;
    } else {
      instance.root.visible = false;
    }
  }

  if (trackedCount === 2) {
    status.textContent = 'BOTH HANDS TRACKED';
  } else if (trackedCount === 1) {
    status.textContent = 'ONE HAND TRACKED';
  } else {
    status.textContent = 'SHOW YOUR HANDS TO THE CAMERA';
  }
}

// ============================================================
// PROCESS MEDIAPIPE RESULTS
// ============================================================

function processHandResults(result, now, dt) {
  const imageHands = result.landmarks || [];
  const worldHands = result.worldLandmarks || [];

  latestImageLandmarks = imageHands;

  for (let i = 0; i < imageHands.length; i++) {
    const imageLandmarks = imageHands[i];
    const worldLandmarks = worldHands[i];

    if (
      !imageLandmarks ||
      imageLandmarks.length !== 21 ||
      !worldLandmarks ||
      worldLandmarks.length !== 21
    ) {
      continue;
    }

    const side = readHandSide(result, i);

    if (!side) continue;

    updateTrackedHand(
      side,
      imageLandmarks,
      worldLandmarks,
      dt,
      now
    );
  }

  updateTrackingStatus(now);
}

// ============================================================
// DETECTION LOOP
// ============================================================

function detectionLoop(now) {
  if (!running) return;

  detectionFrame = requestAnimationFrame(detectionLoop);

  if (
    !handLandmarker ||
    video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
    detectionBusy
  ) {
    return;
  }

  if (now - lastDetectionTime < SETTINGS.detectionInterval) {
    return;
  }

  // Avoid processing the same video frame more than once.
  if (video.currentTime === lastVideoTime) {
    return;
  }

  lastDetectionTime = now;
  lastVideoTime = video.currentTime;

  detectionBusy = true;

  const dt = Math.min(
    SETTINGS.detectionInterval / 1000,
    Math.max(
      0.001,
      (now - (detectionLoop.previousTime || now)) / 1000
    )
  );

  detectionLoop.previousTime = now;

  try {
    const result = handLandmarker.detectForVideo(
      video,
      now
    );

    processHandResults(result, now, dt);
  } catch (error) {
    console.error('Hand detection error:', error);
  } finally {
    detectionBusy = false;
  }

  drawCameraPreview(now);
}

// ============================================================
// RENDER LOOP
// ============================================================

function renderLoop(now) {
  if (!running) return;

  renderFrame = requestAnimationFrame(renderLoop);

  const frameInterval = 1000 / SETTINGS.renderMaxFps;

  if (now - lastRenderTime < frameInterval) {
    return;
  }

  lastRenderTime = now;

  renderer.render(scene, camera);
}

// ============================================================
// START TRACKING
// ============================================================

async function startTracking() {
  if (running) return;

  startButton.disabled = true;
  status.textContent = 'Preparing MorphDrive 3D...';

  try {
    await loadHandModel();
    await initializeHandLandmarker();
    await startCamera();

    running = true;

    lastDetectionTime = -Infinity;
    lastVideoTime = -1;
    lastRenderTime = 0;

    detectionLoop.previousTime = 0;

    status.textContent = 'SHOW YOUR HANDS TO THE CAMERA';

    detectionFrame = requestAnimationFrame(detectionLoop);
    renderFrame = requestAnimationFrame(renderLoop);

    console.info('MorphDrive 3D hand tracking started.');
  } catch (error) {
    console.error('Could not start hand tracking:', error);

    status.textContent =
      `ERROR: ${error.message || 'Could not start camera.'}`;

    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => {
        track.stop();
      });

      cameraStream = null;
      video.srcObject = null;
    }

    running = false;
    startButton.disabled = false;
  }
}

// ============================================================
// STOP TRACKING
// ============================================================

function stopTracking() {
  running = false;

  if (detectionFrame !== null) {
    cancelAnimationFrame(detectionFrame);
    detectionFrame = null;
  }

  if (renderFrame !== null) {
    cancelAnimationFrame(renderFrame);
    renderFrame = null;
  }

  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => {
      track.stop();
    });

    cameraStream = null;
  }

  video.srcObject = null;

  for (const instance of handInstances.values()) {
    instance.root.visible = false;
  }

  latestImageLandmarks = [];

  if (previewContext && previewCanvas) {
    previewContext.clearRect(
      0,
      0,
      previewCanvas.width,
      previewCanvas.height
    );
  }

  status.textContent = 'CAMERA STOPPED';
  startButton.disabled = false;
}

// ============================================================
// EVENT LISTENERS
// ============================================================

startButton.addEventListener('click', () => {
  startTracking();
});

window.addEventListener('beforeunload', () => {
  stopTracking();

  if (handLandmarker) {
    handLandmarker.close();
    handLandmarker = null;
  }

  renderer.dispose();
});

// ============================================================
// INITIAL STATE
// ============================================================

status.textContent = 'READY — START CAMERA';
startButton.disabled = false;

renderer.render(scene, camera);

console.info('MorphDrive 3D hand tracking script loaded.');