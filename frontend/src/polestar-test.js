import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const viewer = document.getElementById('viewer');
const status = document.getElementById('status');
const details = document.getElementById('details');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020711);

const camera = new THREE.PerspectiveCamera(
    38,
    window.innerWidth / window.innerHeight,
    0.01,
    1000
);

camera.position.set(5, 3, 7);

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance'
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;

viewer.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 1;
controls.maxDistance = 40;
controls.target.set(0, 0.8, 0);

scene.add(new THREE.HemisphereLight(0xc5dcff, 0x263247, 2));

const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
keyLight.position.set(5, 8, 6);
scene.add(keyLight);

const fillLight = new THREE.PointLight(0x168bff, 18, 25);
fillLight.position.set(-5, 3, -4);
scene.add(fillLight);

const rimLight = new THREE.PointLight(0x64c9ff, 12, 20);
rimLight.position.set(3, 2, -6);
scene.add(rimLight);

const grid = new THREE.GridHelper(20, 40, 0x245078, 0x142b42);
grid.position.y = -0.01;
scene.add(grid);

const loader = new GLTFLoader();

let model = null;
let mixer = null;
let clips = [];
let anchors = new Map();
let originalTransforms = new Map();

const anchorNames = [
    'ANCHOR_Wheel1',
    'ANCHOR_Wheel2',
    'ANCHOR_Wheel3',
    'ANCHOR_Wheel4',
    'ANCHOR_Door_RearRight',
    'ANCHOR_Door_RearLeft',
    'ANCHOR_Door_FrontRight',
    'ANCHOR_Door_FrontLeft',
    'ANCHOR_Boot'
];

function stopAnimations() {
    if (mixer) {
        mixer.stopAllAction();
    }
}

function restoreAnchors() {
    for (const [name, object] of anchors) {
        const original = originalTransforms.get(name);

        if (!original) continue;

        object.position.copy(original.position);
        object.quaternion.copy(original.quaternion);
        object.scale.copy(original.scale);
    }
}

function playAnimation(name) {
    if (!mixer) return;

    const clip = clips.find(item => item.name === name);

    if (!clip) {
        status.textContent = `Animation not found: ${name}`;
        return;
    }

    stopAnimations();
    restoreAnchors();

    const action = mixer.clipAction(clip);
    action.reset();
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();

    status.textContent = `Playing: ${name}`;
}

function explodeAnchors() {
    if (!anchors.size) return;

    stopAnimations();
    restoreAnchors();

    for (const [name, object] of anchors) {
        const original = originalTransforms.get(name);
        if (!original) continue;

        if (name.includes('Wheel')) {
            object.position.x += Math.sign(original.position.x || 1) * 0.65;
            object.position.y += 0.25;
            object.position.z += Math.sign(original.position.z || 1) * 0.65;
        } else if (name.includes('Door')) {
            object.position.x += Math.sign(original.position.x || 1) * 0.75;
        } else if (name.includes('Boot')) {
            object.position.y += 0.65;
        }
    }

    status.textContent = 'Vehicle anchors separated. Inspect their movement.';
}

function showModelInformation() {
    const meshCount = [];
    let totalMeshes = 0;

    model.traverse(object => {
        if (object.isMesh) {
            totalMeshes++;
            meshCount.push(object);
        }
    });

    details.innerHTML = `
        Meshes: ${totalMeshes}<br>
        Animation clips: ${clips.length}<br>
        Identified anchors: ${anchors.size}/${anchorNames.length}<br>
        <br>
        <strong>Animation clips</strong><br>
        ${clips.map(clip => clip.name).join('<br>') || 'None'}<br>
        <br>
        <strong>Component anchors</strong><br>
        ${[...anchors.keys()].join('<br>') || 'None'}
    `;
}

loader.load(
    '/models/cars/polestar-3-2027/source/Polestar_3_2027_Dual_Motor.glb',
    gltf => {
        model = gltf.scene;
        clips = gltf.animations;

        scene.add(model);

        mixer = new THREE.AnimationMixer(model);

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDimension = Math.max(size.x, size.y, size.z);

        model.position.sub(center);

        camera.position.set(
            maxDimension * 1.5,
            maxDimension * 0.8,
            maxDimension * 1.8
        );

        camera.near = Math.max(maxDimension / 1000, 0.001);
        camera.far = maxDimension * 100;
        camera.updateProjectionMatrix();

        controls.target.set(0, 0, 0);
        controls.update();

        model.traverse(object => {
            if (anchorNames.includes(object.name)) {
                anchors.set(object.name, object);

                originalTransforms.set(object.name, {
                    position: object.position.clone(),
                    quaternion: object.quaternion.clone(),
                    scale: object.scale.clone()
                });
            }

            if (object.isMesh) {
                object.frustumCulled = true;
            }
        });

        showModelInformation();

        status.textContent = 'Polestar 3 loaded successfully.';
    },
    progress => {
        if (progress.total > 0) {
            const percent = Math.round(
                progress.loaded / progress.total * 100
            );

            status.textContent = `Loading vehicle: ${percent}%`;
        } else {
            status.textContent = 'Loading vehicle...';
        }
    },
    error => {
        console.error(error);
        status.textContent = 'Failed to load vehicle. Check the browser console.';
    }
);

document.querySelectorAll('[data-clip]').forEach(button => {
    button.addEventListener('click', () => {
        playAnimation(button.dataset.clip);
    });
});

document.getElementById('stop-animation').addEventListener('click', () => {
    stopAnimations();
    restoreAnchors();
    status.textContent = 'Animation stopped and anchors restored.';
});

document.getElementById('explode').addEventListener('click', explodeAnchors);

document.getElementById('restore').addEventListener('click', () => {
    stopAnimations();
    restoreAnchors();
    status.textContent = 'Vehicle restored to its original anchor positions.';
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
});

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.05);

    if (mixer) {
        mixer.update(delta);
    }

    controls.update();
    renderer.render(scene, camera);
}

animate();
