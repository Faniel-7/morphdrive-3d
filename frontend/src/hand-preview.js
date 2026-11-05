
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const container = document.querySelector('#preview');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020711);

const camera = new THREE.PerspectiveCamera(
  38,
  window.innerWidth / window.innerHeight,
  0.001,
  100
);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance'
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;

scene.add(new THREE.AmbientLight(0xffffff, 1.5));

const blueLight = new THREE.PointLight(0x008cff, 20);
blueLight.position.set(-2, 2, 3);
scene.add(blueLight);

const loader = new GLTFLoader();

loader.load(
  '/models/hand/hand.glb',

  (gltf) => {
    const hand = gltf.scene;

    // Inspect the original model.
    hand.traverse((object) => {
      if (object.isSkinnedMesh) {
        console.log('SKINNED MESH:', object.name);
        console.log('VERTICES:', object.geometry.attributes.position.count);
        console.log('UV MAPPING:', {
  available: !!object.geometry.attributes.uv,
  count: object.geometry.attributes.uv?.count ?? 0,
  indexed: !!object.geometry.index,
  triangles: object.geometry.index
    ? object.geometry.index.count / 3
    : object.geometry.attributes.position.count / 3
});

console.log('GEOMETRY ATTRIBUTES:', Object.keys(object.geometry.attributes));
        console.log(
          'BONES:',
          object.skeleton.bones.map((bone) => bone.name)
        );

        // First holographic material test.
        object.material = new THREE.MeshBasicMaterial({
          color: 0x16cfff,
          wireframe: true,
          transparent: true,
          opacity: 0.95,
          side: THREE.DoubleSide,
          depthWrite: false
        });
      }
    });

    // Calculate the model's dimensions.
    const bounds = new THREE.Box3().setFromObject(hand);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());

    // Center the model.
    hand.position.sub(center);
    scene.add(hand);

    // Inspect the original rig hierarchy and bone positions.
hand.updateMatrixWorld(true);

const boneDetails = [];

hand.traverse((object) => {
  if (object.isBone) {
    const position = new THREE.Vector3();
    object.getWorldPosition(position);

    boneDetails.push({
      bone: object.name,
      parent: object.parent?.name || 'none',
      x: Number(position.x.toFixed(3)),
      y: Number(position.y.toFixed(3)),
      z: Number(position.z.toFixed(3))
    });
  }
});

console.table(boneDetails);

const localBoneDetails = [];

hand.traverse((object) => {
  if (object.isBone) {
    localBoneDetails.push({
      bone: object.name,
      localX: Number(object.position.x.toFixed(3)),
      localY: Number(object.position.y.toFixed(3)),
      localZ: Number(object.position.z.toFixed(3)),
      rotX: Number(object.rotation.x.toFixed(3)),
      rotY: Number(object.rotation.y.toFixed(3)),
      rotZ: Number(object.rotation.z.toFixed(3)),
      quatX: Number(object.quaternion.x.toFixed(3)),
      quatY: Number(object.quaternion.y.toFixed(3)),
      quatZ: Number(object.quaternion.z.toFixed(3)),
      quatW: Number(object.quaternion.w.toFixed(3))
    });
  }
});

console.log("HAND BONE LOCAL ORIENTATIONS");
console.table(localBoneDetails);
    // Automatically frame the complete hand.
    const maxDimension = Math.max(size.x, size.y, size.z);
    const distance =
      (maxDimension / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))) * 1.5;

    const direction = new THREE.Vector3(0.6, 0.3, 1).normalize();

    camera.position.copy(direction.multiplyScalar(distance));
    camera.near = maxDimension / 1000;
    camera.far = maxDimension * 20;
    camera.updateProjectionMatrix();

    controls.target.set(0, 0, 0);
    controls.minDistance = maxDimension * 0.7;
    controls.maxDistance = maxDimension * 8;
    controls.update();

    console.log('MODEL DIMENSIONS:', size);
    console.log('HAND PREVIEW READY');

    document.querySelector('#info').textContent =
      'HOLOGRAPHIC HAND — Drag to rotate, scroll to zoom';
  },

  undefined,

  (error) => {
    console.error('HAND MODEL ERROR:', error);
    document.querySelector('#info').textContent =
      'ERROR: Could not load hand.glb';
  }
);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
