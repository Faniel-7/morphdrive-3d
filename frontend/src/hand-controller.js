import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import {
  HandLandmarker,
  FilesetResolver
} from '@mediapipe/tasks-vision';

export function createHandController({ scene, camera, viewport }) {
  const video = document.createElement('video');
  const orientationStatus = document.querySelector('#hand-orientation');
  const startButton = document.querySelector('#start-hand-control');
  const status = document.querySelector('#hand-status');

  if (!scene?.isObject3D || !camera?.isCamera || !viewport ||
      !startButton || !status) {
    throw new Error('Missing required elements for hand control.');
  }

  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;

  const SETTINGS = {
    maxHands: 2,
    modelHeight: 12,

    // Time constants in seconds. A little more filtering reduces
    // landmark jitter without making the hand feel sluggish.
    positionTime: 0.075,
    rotationTime: 0.095,
    imageTime: 0.065,
    landmarkTime: 0.075,
    boneTime: 0.095,
    scaleTime: 0.12,

    scaleMin: 0.35,
    scaleMax: 1.8,
    visualScale: 0.72,

    detectionInterval: 40,
    lostHandGraceMs: 420,
    handIdentityGraceMs: 650,
    identitySwitchMargin: 0.045,

    showCameraPreview: true,
    previewInterval: 45
  };

  // ------------------------------------------------------------
  // STATE
  // ------------------------------------------------------------

  let previewCanvas = null;
  let previewContext = null;
  let previewWrapper = null;
  let latestImageLandmarks = [];
  let lastPreviewDraw = 0;

  let originalHandScene = null;
  let handModelReady = false;
  let handLandmarker = null;
  let cameraStream = null;

  let running = false;
  let disposed = false;
  let detectionBusy = false;

  let lastDetectionTime = -Infinity;
  let lastVideoTime = -1;
  let detectionFrame = null;

  const handInstances = new Map();
  const loader = new GLTFLoader();

  const cyanMaterial = new THREE.MeshBasicMaterial({
    color: 0x16cfff,
    wireframe: true,
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const FINGER_SEGMENTS = [
    ['index_meta', 0, 5, 'index_prox'],
    ['index_prox', 5, 6, 'index_midd'],
    ['index_midd', 6, 7, 'index_dist'],
    ['index_dist', 7, 8, null],

    ['midd_meta', 0, 9, 'midd_prox'],
    ['midd_prox', 9, 10, 'midd_midd'],
    ['midd_midd', 10, 11, 'midd_dist'],
    ['midd_dist', 11, 12, null],

    ['ring_meta', 0, 13, 'ring_prox'],
    ['ring_prox', 13, 14, 'ring_midd'],
    ['ring_midd', 14, 15, 'ring_dist'],
    ['ring_dist', 15, 16, null],

    ['pinky_meta', 0, 17, 'pinky_prox'],
    ['pinky_prox', 17, 18, 'pinky_midd'],
    ['pinky_midd', 18, 19, 'pinky_dist'],
    ['pinky_dist', 19, 20, null],

    ['thumb_trapez', 0, 1, 'thumb_meta'],
    ['thumb_meta', 1, 2, 'thumb_prox'],
    ['thumb_prox', 2, 3, 'thumb_dist'],
    ['thumb_dist', 3, 4, null]
  ];

  const REQUIRED_BONES = [
    'radius_ulna',
    'index_meta', 'index_prox', 'index_midd', 'index_dist',
    'midd_meta', 'midd_prox', 'midd_midd', 'midd_dist',
    'ring_meta', 'ring_prox', 'ring_midd', 'ring_dist',
    'pinky_meta', 'pinky_prox', 'pinky_midd', 'pinky_dist',
    'thumb_trapez', 'thumb_meta', 'thumb_prox', 'thumb_dist'
  ];

  const PALM_IDS = [0, 5, 9, 13, 17];

  // ------------------------------------------------------------
  // SMALL HELPERS
  // ------------------------------------------------------------

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function smoothingAlpha(dt, timeConstant) {
    if (timeConstant <= 0) return 1;
    return 1 - Math.exp(-Math.max(0, dt) / timeConstant);
  }

  function validVector(vector) {
    return Number.isFinite(vector.x) &&
      Number.isFinite(vector.y) &&
      Number.isFinite(vector.z) &&
      vector.lengthSq() > 1e-10;
  }

  function worldPoint(point) {
    // MediaPipe world coordinates are converted into the controller's
    // mirrored coordinate convention, consistently with image X.
    return new THREE.Vector3(-point.x, -point.y, -point.z);
  }

  function imageCenter(landmarks) {
    const center = new THREE.Vector2();
    for (const id of PALM_IDS) {
      center.x += 1 - landmarks[id].x;
      center.y += landmarks[id].y;
    }
    return center.multiplyScalar(1 / PALM_IDS.length);
  }

  function normalizedHandCenter(landmarks) {
    const center = imageCenter(landmarks);
    return { x: center.x, y: center.y };
  }

  function directionBetween(points, start, end) {
    const a = worldPoint(points[start]);
    const b = worldPoint(points[end]);
    const direction = b.sub(a);
    if (direction.lengthSq() > 1e-10) direction.normalize();
    return direction;
  }

  function makeFrame(across, up, previousQuaternion = null) {
    const xAxis = across.clone();
    const yInput = up.clone();

    if (!validVector(xAxis) || !validVector(yInput)) return null;

    xAxis.normalize();

    const yAxis = yInput.addScaledVector(xAxis, -yInput.dot(xAxis));
    if (yAxis.lengthSq() < 2.5e-3) return null;
    yAxis.normalize();

    const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis);
    if (zAxis.lengthSq() < 2.5e-3) return null;
    zAxis.normalize();

    const correctedY = new THREE.Vector3()
      .crossVectors(zAxis, xAxis)
      .normalize();

    const matrix = new THREE.Matrix4().makeBasis(
      xAxis, correctedY, zAxis
    );

    const result = new THREE.Quaternion()
      .setFromRotationMatrix(matrix)
      .normalize();

    // q and -q represent the same rotation. Keep the sign continuous
    // so interpolation does not occasionally take the long path.
    if (previousQuaternion && result.dot(previousQuaternion) < 0) {
      result.set(-result.x, -result.y, -result.z, -result.w);
    }
    return result;
  }

  function getObservedPalmFrame(points, previousQuaternion = null) {
    const wrist = worldPoint(points[0]);
    const indexBase = worldPoint(points[5]);
    const middleBase = worldPoint(points[9]);
    const pinkyBase = worldPoint(points[17]);

    return makeFrame(
      pinkyBase.sub(indexBase),
      middleBase.sub(wrist),
      previousQuaternion
    );
  }

  function getViewSize() {
    const distance = 5.5;
    const height = 2 * distance * Math.tan(
      THREE.MathUtils.degToRad(camera.fov / 2)
    );
    return {
      width: height * camera.aspect,
      height,
      distance
    };
  }

  // ------------------------------------------------------------
  // CAMERA PREVIEW
  // ------------------------------------------------------------

  function createCameraPreview() {
    if (!SETTINGS.showCameraPreview || previewWrapper) return;

    previewWrapper = document.createElement('div');
    previewWrapper.id = 'morphdrive-camera-preview';
    previewWrapper.style.cssText = [
      'position:absolute',
      'top:54px',
      'right:12px',
      'width:min(180px,28%)',
      'max-width:calc(100% - 24px)',
      'aspect-ratio:4/3',
      'z-index:6',
      'box-sizing:border-box',
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
      'object-fit:fill',
      'transform:scaleX(-1)',
      'opacity:1',
      'display:block',
      'pointer-events:none'
    ].join(';');

    previewCanvas = document.createElement('canvas');
    previewCanvas.width = 640;
    previewCanvas.height = 480;
    previewCanvas.style.cssText = [
      'position:absolute',
      'inset:0',
      'width:100%',
      'height:100%',
      'z-index:1',
      'pointer-events:none'
    ].join(';');

    previewContext = previewCanvas.getContext('2d');

    previewWrapper.append(video, previewCanvas, previewLabel);
    viewport.appendChild(previewWrapper);
  }

  function synchronizePreviewSize() {
    if (!previewCanvas || !video.videoWidth || !video.videoHeight) return;
    previewCanvas.width = video.videoWidth;
    previewCanvas.height = video.videoHeight;
    previewWrapper.style.aspectRatio =
      `${video.videoWidth}/${video.videoHeight}`;
  }

  function drawCameraPreview(now = 0) {
    if (!previewContext || !previewCanvas) return;
    if (now - lastPreviewDraw < SETTINGS.previewInterval) return;
    lastPreviewDraw = now;

    const ctx = previewContext;
    const width = previewCanvas.width;
    const height = previewCanvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.save();

    ctx.strokeStyle = 'rgba(85,220,255,.45)';
    ctx.lineWidth = Math.max(1, width / 320);
    ctx.setLineDash([width * 0.014, width * 0.012]);
    ctx.strokeRect(width * 0.05, height * 0.10, width * 0.90, height * 0.82);
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(100,220,255,.7)';
    ctx.font = `${Math.max(10, width * 0.025)}px monospace`;
    ctx.fillText('KEEP HANDS INSIDE FRAME', width * 0.065, height * 0.145);

    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [0, 9], [9, 10], [10, 11], [11, 12],
      [0, 13], [13, 14], [14, 15], [15, 16],
      [0, 17], [17, 18], [18, 19], [19, 20],
      [5, 9], [9, 13], [13, 17]
    ];

    for (const hand of latestImageLandmarks) {
      ctx.strokeStyle = 'rgba(22,207,255,.9)';
      ctx.lineWidth = Math.max(1.5, width / 220);
      ctx.beginPath();

      for (const [a, b] of connections) {
        ctx.moveTo((1 - hand[a].x) * width, hand[a].y * height);
        ctx.lineTo((1 - hand[b].x) * width, hand[b].y * height);
      }
      ctx.stroke();

      ctx.fillStyle = '#baf7ff';
      for (const point of hand) {
        ctx.beginPath();
        ctx.arc(
          (1 - point.x) * width,
          point.y * height,
          Math.max(2, width / 160),
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
    ctx.restore();
  }

  createCameraPreview();

  // ------------------------------------------------------------
  // 3D HAND INSTANCE
  // ------------------------------------------------------------

  function createHandInstance(side) {
    if (!originalHandScene) return null;

    const root = new THREE.Group();
    root.name = `${side}_TrackedHand`;
    root.visible = false;
    scene.add(root);

    const modelContainer = new THREE.Group();
    root.add(modelContainer);

    const model = SkeletonUtils.clone(originalHandScene);
    modelContainer.add(model);

    const bones = {};

    model.traverse(object => {
      if (object.isBone) bones[object.name] = object;

      if (object.isMesh || object.isSkinnedMesh) {
        const materialForMesh = () => cyanMaterial.clone();
        object.material = Array.isArray(object.material)
          ? object.material.map(materialForMesh)
          : materialForMesh();
        object.frustumCulled = false;
      }
    });

    const missing = REQUIRED_BONES.filter(name => !bones[name]);
    if (missing.length) {
      console.error(`${side} hand model is missing bones:`, missing);
      root.removeFromParent();
      return null;
    }

    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const largestDimension = Math.max(size.x, size.y, size.z);

    if (!Number.isFinite(largestDimension) || largestDimension <= 0) {
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

    // Keep the model's anatomical orientation; mirror the left instance
    // at its container level rather than changing the rig's bone data.
    if (side === 'Left') modelContainer.scale.x = -1;

    root.updateMatrixWorld(true);

    const restBones = {};

    for (const [boneName, startIndex, endIndex, nextBoneName] of FINGER_SEGMENTS) {
      const bone = bones[boneName];
      const inverseBoneWorld = bone.matrixWorld.clone().invert();
      let restDirectionLocal;

      if (nextBoneName) {
        const childWorldPosition = new THREE.Vector3();
        bones[nextBoneName].getWorldPosition(childWorldPosition);
        restDirectionLocal = childWorldPosition
          .applyMatrix4(inverseBoneWorld)
          .normalize();
      } else {
        const parentWorldPosition = new THREE.Vector3();
        const boneWorldPosition = new THREE.Vector3();
        bone.parent.getWorldPosition(parentWorldPosition);
        bone.getWorldPosition(boneWorldPosition);
        restDirectionLocal = boneWorldPosition
          .sub(parentWorldPosition)
          .transformDirection(inverseBoneWorld)
          .normalize();
      }

      if (!validVector(restDirectionLocal)) {
        console.error(`Invalid rest direction for ${boneName}`);
        root.removeFromParent();
        return null;
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

    const rootInverse = root.matrixWorld.clone().invert();
    const rootPoint = object => {
      const point = new THREE.Vector3();
      object.getWorldPosition(point);
      return point.applyMatrix4(rootInverse);
    };

    const wristPosition = rootPoint(bones.radius_ulna);
    const indexPosition = rootPoint(bones.index_prox);
    const middlePosition = rootPoint(bones.midd_prox);
    const ringPosition = rootPoint(bones.ring_prox);
    const pinkyPosition = rootPoint(bones.pinky_prox);

    const palmAnchor = wristPosition.clone()
      .add(indexPosition)
      .add(middlePosition)
      .add(ringPosition)
      .add(pinkyPosition)
      .multiplyScalar(0.2);

    modelContainer.position.sub(palmAnchor);
    root.updateMatrixWorld(true);

    const anchoredRootInverse = root.matrixWorld.clone().invert();
    const anchoredPoint = object => {
      const point = new THREE.Vector3();
      object.getWorldPosition(point);
      return point.applyMatrix4(anchoredRootInverse);
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
      console.error(`Could not establish ${side} model palm frame.`);
      root.removeFromParent();
      return null;
    }

    const restPalmWidth = anchoredIndex.distanceTo(anchoredPinky);
    if (!Number.isFinite(restPalmWidth) || restPalmWidth < 0.001) {
      console.error(`Invalid ${side} hand palm width.`);
      root.removeFromParent();
      return null;
    }

    const anchoredBounds = new THREE.Box3().setFromObject(model);
    const anchoredSize = anchoredBounds.getSize(new THREE.Vector3());
    const handRadius = Math.max(
      anchoredSize.x, anchoredSize.y, anchoredSize.z
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
      smoothedImage: null,
      lastObservedFrame: null,
      position: new THREE.Vector3(),
      rotation: new THREE.Quaternion(),
      scale: 1,
      positionReady: false,
      rotationReady: false,
      scaleReady: false,
      lastImageCenter: null,
      lastSeen: 0,
      hoverNdc: null,
      hoverPosition: null,
      palmFacing: null
    };

    handInstances.set(side, instance);

    console.info(`${side} hand rig ready`, {
      bones: Object.keys(bones).length,
      restPalmWidth,
      modelSize: size
    });

    return instance;
  }

  // ------------------------------------------------------------
  // LANDMARK FILTERING
  // ------------------------------------------------------------

  function smoothLandmarks(instance, input, dt, property, timeConstant) {
    if (!input || input.length !== 21) return null;

    if (!instance[property]) {
      instance[property] = input.map(point => ({
        x: point.x,
        y: point.y,
        z: point.z
      }));
      return instance[property];
    }

    const alpha = smoothingAlpha(dt, timeConstant);
    for (let i = 0; i < 21; i++) {
      const current = instance[property][i];
      const target = input[i];
      current.x += (target.x - current.x) * alpha;
      current.y += (target.y - current.y) * alpha;
      current.z += (target.z - current.z) * alpha;
    }
    return instance[property];
  }

  function smoothWorldLandmarks(instance, input, dt) {
    return smoothLandmarks(
      instance, input, dt, 'smoothedWorld', SETTINGS.landmarkTime
    );
  }

  function smoothImageLandmarks(instance, input, dt) {
    return smoothLandmarks(
      instance, input, dt, 'smoothedImage', SETTINGS.imageTime
    );
  }

  // ------------------------------------------------------------
  // HAND POSITION / ROTATION
  // ------------------------------------------------------------

  function updateHandPosition(instance, imageLandmarks, dt) {
    const center = imageCenter(imageLandmarks);
    const view = getViewSize();

    camera.updateMatrixWorld(true);

    // Image Y grows downward; camera-local Y grows upward.
    const target = camera.localToWorld(new THREE.Vector3(
      (center.x - 0.5) * view.width,
      (0.5 - center.y) * view.height,
      -view.distance
    ));

    const dx = (imageLandmarks[5].x - imageLandmarks[17].x) * view.width;
    const dy = (imageLandmarks[5].y - imageLandmarks[17].y) * view.height;
    const observedPalmWidth = Math.hypot(dx, dy);

    const targetScale = clamp(
      (observedPalmWidth / Math.max(instance.restPalmWidth, 0.001)) *
        SETTINGS.visualScale,
      SETTINGS.scaleMin,
      SETTINGS.scaleMax
    );

    if (!instance.scaleReady) {
      instance.scale = targetScale;
      instance.scaleReady = true;
    } else {
      instance.scale += (targetScale - instance.scale) *
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

    const indexTip = imageLandmarks[8];

    const targetHoverNdc = new THREE.Vector2(
      1 - (indexTip.x * 2),
      1 - (indexTip.y * 2)
    );

    if (!instance.hoverNdc) {
      instance.hoverNdc = targetHoverNdc;
    } else {
      instance.hoverNdc.lerp(
        targetHoverNdc,
        smoothingAlpha(dt, SETTINGS.positionTime)
      );
    }

    const hoverTarget = camera.localToWorld(new THREE.Vector3(
      (0.5 - indexTip.x) * view.width,
      (0.5 - indexTip.y) * view.height,
      -view.distance
    ));

    if (!instance.hoverPosition) {
      instance.hoverPosition = hoverTarget.clone();
    } else {
      instance.hoverPosition.lerp(
        hoverTarget,
        smoothingAlpha(dt, SETTINGS.positionTime)
      );
    }

    instance.root.scale.setScalar(instance.scale);
  }

  function updatePalmRotation(instance, worldLandmarks, dt) {
    const observedFrame = getObservedPalmFrame(
      worldLandmarks,
      instance.lastObservedFrame
    );
    if (!observedFrame) return;

    instance.lastObservedFrame = observedFrame.clone();

    const targetRotation = camera.quaternion.clone()
      .multiply(observedFrame)
      .multiply(instance.restPalmFrame.clone().invert())
      .normalize();

    if (!instance.rotationReady) {
      instance.rotation.copy(targetRotation);
      instance.rotationReady = true;
    } else {
      instance.rotation.slerp(
        targetRotation,
        smoothingAlpha(dt, SETTINGS.rotationTime)
      );
    }

    instance.root.quaternion.copy(instance.rotation);
  }

  function makeStableSwing(restDirection, targetDirection) {
    const dot = clamp(restDirection.dot(targetDirection), -1, 1);
    const maximumAngle = THREE.MathUtils.degToRad(150);
    const angle = Math.acos(dot);
    const swing = new THREE.Quaternion();

    if (angle <= maximumAngle) {
      return swing.setFromUnitVectors(restDirection, targetDirection);
    }

    const axis = new THREE.Vector3().crossVectors(
      restDirection, targetDirection
    );

    if (axis.lengthSq() < 1e-8) {
      axis.crossVectors(restDirection, new THREE.Vector3(0, 0, 1));
      if (axis.lengthSq() < 1e-8) {
        axis.crossVectors(restDirection, new THREE.Vector3(1, 0, 0));
      }
    }

    axis.normalize();
    return swing.setFromAxisAngle(axis, maximumAngle);
  }

  function updateFingerBone(instance, boneName, start, end, points, dt) {
    const bone = instance.bones[boneName];
    const rest = instance.restBones[boneName];
    if (!bone || !rest || !bone.parent) return;

    const targetWorldDirection = directionBetween(points, start, end)
      .applyQuaternion(camera.quaternion);

    if (!validVector(targetWorldDirection)) return;

    bone.parent.updateWorldMatrix(true, false);
    const parentInverse = bone.parent.matrixWorld.clone().invert();

    const targetParentDirection = targetWorldDirection.clone()
      .transformDirection(parentInverse)
      .normalize();

    const restParentDirection = rest.restDirectionLocal.clone()
      .applyQuaternion(rest.restQuaternion)
      .normalize();

    if (!validVector(targetParentDirection) ||
        !validVector(restParentDirection)) return;

    const swing = makeStableSwing(
      restParentDirection, targetParentDirection
    );

    const desiredLocal = swing.multiply(rest.restQuaternion);

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
    for (const [boneName, start, end] of FINGER_SEGMENTS) {
      updateFingerBone(instance, boneName, start, end, points, dt);
    }
  }

  function updateTrackedHand(side, imageLandmarks, worldLandmarks, dt, now) {
    let instance = handInstances.get(side);
    if (!instance) instance = createHandInstance(side);
    if (!instance) return;

    const smoothedImage = smoothImageLandmarks(instance, imageLandmarks, dt);
    const smoothedWorld = smoothWorldLandmarks(instance, worldLandmarks, dt);
    if (!smoothedImage || !smoothedWorld) return;

    instance.lastSeen = now;
    instance.lastImageCenter = normalizedHandCenter(imageLandmarks);
    instance.root.visible = true;

    updateHandPosition(instance, smoothedImage, dt);
    updatePalmRotation(instance, smoothedWorld, dt);

    const palmFrame = getObservedPalmFrame(smoothedWorld);
    if (palmFrame && orientationStatus) {
      const palmNormal = new THREE.Vector3(0, 0, 1)
        .applyQuaternion(palmFrame);
      const facingScore = palmNormal.z;

      if (Math.abs(facingScore) < 0.22) {
        orientationStatus.textContent =
          `${side.toUpperCase()} HAND: EDGE-ON`;
      } else if (facingScore > 0) {
        instance.palmFacing = true;
        orientationStatus.textContent =
          `${side.toUpperCase()} HAND: PALM`;
      } else {
        instance.palmFacing = false;
        orientationStatus.textContent =
          `${side.toUpperCase()} HAND: BACK`;
      }
    }

    instance.root.updateMatrixWorld(true);
    updateAllFingerBones(instance, smoothedWorld, dt);
    instance.root.updateMatrixWorld(true);
  }

  // ------------------------------------------------------------
  // HAND IDENTITY
  // ------------------------------------------------------------

  function readHandSide(result, index) {
    const groups = result.handednesses || result.handedness;
    const category = groups?.[index]?.[0]?.categoryName;

    if (category !== 'Left' && category !== 'Right') return null;

    // MediaPipe labels refer to the anatomical hand. The preview is
    // mirrored, but the controller's established side convention
    // intentionally maps the label to the opposite screen-side name.
    return category === 'Left' ? 'Right' : 'Left';
  }

  function distanceBetweenCenters(a, b) {
    if (!a || !b) return Infinity;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function assignHandSides(result, imageResults, now) {
    const assignments = new Array(imageResults.length).fill(null);
    const candidates = imageResults.map((landmarks, index) => ({
      index,
      center: normalizedHandCenter(landmarks),
      classified: readHandSide(result, index)
    }));

    // With two hands present, use the previous screen positions to
    // maintain identity through short handedness-label fluctuations.
    if (candidates.length === 2) {
      const left = handInstances.get('Left');
      const right = handInstances.get('Right');

      const recent = instance =>
        instance?.lastImageCenter &&
        now - instance.lastSeen < SETTINGS.handIdentityGraceMs;

      if (recent(left) && recent(right)) {
        const direct =
          distanceBetweenCenters(candidates[0].center, left.lastImageCenter) +
          distanceBetweenCenters(candidates[1].center, right.lastImageCenter);
        const crossed =
          distanceBetweenCenters(candidates[0].center, right.lastImageCenter) +
          distanceBetweenCenters(candidates[1].center, left.lastImageCenter);

        if (crossed + SETTINGS.identitySwitchMargin < direct) {
          assignments[0] = 'Right';
          assignments[1] = 'Left';
          return assignments;
        }
        if (direct <= crossed + SETTINGS.identitySwitchMargin) {
          assignments[0] = 'Left';
          assignments[1] = 'Right';
          return assignments;
        }
      }
    }

    const used = new Set();

    // First honor labels when they do not collide.
    for (const candidate of candidates) {
      const side = candidate.classified;
      if (side && !used.has(side)) {
        assignments[candidate.index] = side;
        used.add(side);
      }
    }

    // Resolve missing/duplicate labels by nearest recent track.
    for (const candidate of candidates) {
      if (assignments[candidate.index]) continue;

      let bestSide = null;
      let bestDistance = Infinity;

      for (const side of ['Left', 'Right']) {
        if (used.has(side)) continue;
        const instance = handInstances.get(side);
        if (!instance?.lastImageCenter ||
            now - instance.lastSeen > SETTINGS.handIdentityGraceMs) {
          continue;
        }

        const distance = distanceBetweenCenters(
          candidate.center, instance.lastImageCenter
        );
        if (distance < bestDistance) {
          bestDistance = distance;
          bestSide = side;
        }
      }

      if (bestSide) {
        assignments[candidate.index] = bestSide;
        used.add(bestSide);
      }
    }

    // Allocate any remaining detection to a free side.
    for (const candidate of candidates) {
      if (assignments[candidate.index]) continue;
      const freeSide = ['Left', 'Right'].find(side => !used.has(side));
      if (freeSide) {
        assignments[candidate.index] = freeSide;
        used.add(freeSide);
      }
    }

    return assignments;
  }

  // ------------------------------------------------------------
  // MEDIAPIPE DETECTION
  // ------------------------------------------------------------

  function processDetection(now) {
    if (!running || detectionBusy || !handLandmarker ||
        video.readyState < 2) return;

    if (video.currentTime === lastVideoTime) return;
    if (now - lastDetectionTime < SETTINGS.detectionInterval) return;

    detectionBusy = true;
    lastVideoTime = video.currentTime;
    lastDetectionTime = now;

    try {
      const result = handLandmarker.detectForVideo(video, now);
      const imageResults = result.landmarks || [];
      const worldResults = result.worldLandmarks || [];

      latestImageLandmarks = imageResults;
      drawCameraPreview(now);

      const assignments = assignHandSides(result, imageResults, now);
      const visibleSides = new Set();

      for (let i = 0; i < imageResults.length; i++) {
        const imageLandmarks = imageResults[i];
        const worldLandmarks = worldResults[i];
        const side = assignments[i];

        if (!side || !imageLandmarks || !worldLandmarks ||
            imageLandmarks.length !== 21 ||
            worldLandmarks.length !== 21 ||
            visibleSides.has(side)) continue;

        visibleSides.add(side);

        const instance = handInstances.get(side);
        const previousTime = instance?.lastSeen || now;
        const dt = clamp((now - previousTime) / 1000, 0.001, 0.15);

        updateTrackedHand(
          side, imageLandmarks, worldLandmarks, dt, now
        );
      }

      for (const [side, instance] of handInstances) {
        if (!visibleSides.has(side) &&
            now - instance.lastSeen > SETTINGS.lostHandGraceMs) {
          instance.root.visible = false;
        }
      }

      if (visibleSides.size === 2) {
        status.textContent = 'BOTH HANDS TRACKED';
      } else if (visibleSides.size === 1) {
        status.textContent =
          `${[...visibleSides][0].toUpperCase()} HAND TRACKED`;
      } else {
        status.textContent = 'SHOW ONE OR BOTH HANDS';
      }
    } catch (error) {
      console.error('Hand detection error:', error);
      status.textContent = 'TRACKING ERROR — CHECK CONSOLE';
    } finally {
      detectionBusy = false;
    }
  }

  function scheduleDetection() {
    if (!running || disposed) return;

    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
      detectionFrame = video.requestVideoFrameCallback(now => {
        processDetection(now);
        scheduleDetection();
      });
    } else {
      detectionFrame = requestAnimationFrame(now => {
        processDetection(now);
        scheduleDetection();
      });
    }
  }

  // ------------------------------------------------------------
  // LOAD HAND MODEL
  // ------------------------------------------------------------

  status.textContent = 'LOADING ANATOMICAL HAND MODEL...';

  loader.load(
    '/models/hand/hand.glb',
    gltf => {
      if (disposed) return;
      originalHandScene = gltf.scene;
      handModelReady = true;
      status.textContent = '3D HAND READY — INITIALIZE CAMERA';
      console.info('Anatomical hand GLB loaded.');
    },
    undefined,
    error => {
      if (disposed) return;
      console.error('Could not load /models/hand/hand.glb:', error);
      status.textContent = 'ERROR: COULD NOT LOAD HAND MODEL';
    }
  );

  // ------------------------------------------------------------
  // MEDIAPIPE INITIALIZATION
  // ------------------------------------------------------------

  async function initializeMediaPipe() {
    status.textContent = 'INITIALIZING MEDIAPIPE...';

    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm'
    );

    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: '/models/mediapipe/hand_landmarker.task',
        delegate: 'CPU'
      },
      runningMode: 'VIDEO',
      numHands: SETTINGS.maxHands,
      minHandDetectionConfidence: 0.55,
      minHandPresenceConfidence: 0.55,
      minTrackingConfidence: 0.55
    });

    console.info('MediaPipe initialized.');
  }

  // ------------------------------------------------------------
  // CAMERA START / STOP
  // ------------------------------------------------------------

  async function startCamera() {
    if (running || disposed) return;

    try {
      startButton.disabled = true;
      startButton.textContent = 'INITIALIZING...';

      if (!handModelReady) {
        status.textContent = 'WAITING FOR 3D HAND MODEL...';
        startButton.disabled = false;
        startButton.textContent = 'INITIALIZE HAND SCANNER';
        return;
      }

      if (!handLandmarker) await initializeMediaPipe();

      status.textContent = 'REQUESTING CAMERA...';

      cameraStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 640, min: 480 },
          height: { ideal: 480, min: 360 },
          frameRate: { ideal: 24, max: 30 }
        }
      });

      if (disposed) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
        return;
      }

      createCameraPreview();
      video.srcObject = cameraStream;

      await new Promise((resolve, reject) => {
        if (video.readyState >= 2) {
          resolve();
          return;
        }

        const onReady = () => {
          cleanup();
          resolve();
        };
        const onError = () => {
          cleanup();
          reject(new Error('The webcam video stream did not become ready.'));
        };
        const cleanup = () => {
          video.removeEventListener('loadeddata', onReady);
          video.removeEventListener('error', onError);
        };

        video.addEventListener('loadeddata', onReady, { once: true });
        video.addEventListener('error', onError, { once: true });
      });

      await video.play();
      synchronizePreviewSize();

      running = true;
      lastVideoTime = -1;
      lastDetectionTime = -Infinity;

      startButton.style.display = 'none';
      status.textContent = 'PLACE YOUR HANDS INSIDE THE CAMERA GUIDE';
      scheduleDetection();
    } catch (error) {
      console.error('Hand scanner startup failed:', error);
      status.textContent = `STARTUP ERROR: ${error.message}`;

      startButton.disabled = false;
      startButton.textContent = 'TRY AGAIN';

      cameraStream?.getTracks().forEach(track => track.stop());
      cameraStream = null;
      video.srcObject = null;
    }
  }

  startButton.addEventListener('click', startCamera);

  // ------------------------------------------------------------
  // PUBLIC TRACKING DATA
  // ------------------------------------------------------------

  function getTrackedPointers() {
    return [...handInstances.values()]
      .filter(instance => instance.root.visible && instance.hoverNdc)
      .map(instance => instance.hoverNdc.clone());
  }

  function getTrackedHands() {
    return [...handInstances.values()]
      .filter(instance => instance.root.visible)
      .map(instance =>
        (instance.hoverPosition || instance.root.position).clone()
      );
  }

  function getStatus() {
    return status.textContent;
  }

  // ------------------------------------------------------------
  // CLEANUP
  // ------------------------------------------------------------

  function disposeHandInstance(instance) {
    instance.root.removeFromParent();

    instance.model.traverse(object => {
      if (object.isMesh || object.isSkinnedMesh) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material?.dispose();
        }
      }
    });
  }

  function stop() {
    if (disposed) return;

    running = false;

    if (detectionFrame !== null) {
      if ('requestVideoFrameCallback' in HTMLVideoElement.prototype &&
          video.cancelVideoFrameCallback) {
        video.cancelVideoFrameCallback(detectionFrame);
      } else {
        cancelAnimationFrame(detectionFrame);
      }
      detectionFrame = null;
    }

    cameraStream?.getTracks().forEach(track => track.stop());
    cameraStream = null;
    video.pause();
    video.srcObject = null;

    handLandmarker?.close();
    handLandmarker = null;

    for (const instance of handInstances.values()) {
      disposeHandInstance(instance);
    }
    handInstances.clear();

    latestImageLandmarks = [];

    if (previewWrapper) {
      previewWrapper.remove();
      previewWrapper = null;
      previewCanvas = null;
      previewContext = null;
    }

    // Allow a later start() call to initialize MediaPipe again.
    startButton.style.display = '';
    startButton.disabled = false;
    startButton.textContent = 'INITIALIZE HAND SCANNER';
    status.textContent = 'HAND SCANNER STOPPED';
    if (orientationStatus) orientationStatus.textContent = '';
  }

  function dispose() {
    if (disposed) return;
    stop();
    disposed = true;
    startButton.removeEventListener('click', startCamera);
    cyanMaterial.dispose();
  }

  return {
    start: startCamera,
    stop,
    dispose,
    getTrackedPointers,
    getTrackedHands,
    getStatus
  };
}
