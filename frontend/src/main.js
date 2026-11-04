
import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ============================================
// MORPHDRIVE 3D - MAIN INTERFACE
// ============================================

document.querySelector('#app').innerHTML = `
<div class="cockpit">

  <header class="topbar">
    <div class="brand">
      <span class="brand-mark">⬡</span>
      <strong>NEODUSTRIA</strong>
    </div>

    <div class="app-name">3D Design Cockpit</div>

    <div class="top-actions">
      <span>Project: NDX-2025-001</span>
      <button title="Search">⌕</button>
      <button title="Help">?</button>
      <button title="Notifications">♧</button>
      <button class="profile">◉ <small>EN⌄</small></button>
    </div>
  </header>

  <main class="workspace">

    <!-- LEFT MODEL BROWSER -->

    <aside class="browser panel">

      <div class="panel-heading">
        <span>MODEL BROWSER</span>
        <span class="blue">⛶</span>
      </div>

      <div class="model-name">
        ⬡ &nbsp;Vehicle_Concept_v12
        <span>›</span>
      </div>

      <div class="section-label">Assemblies</div>

      <nav class="assembly-list">
        ${[
          'Body_Structure',
          'Chassis_System',
          'Powertrain_System',
          'Interior_System',
          'Electrical_System',
          'Cooling_System',
          'Suspension_System',
          'Braking_System',
          'Wheels_Tires',
          'Fasteners',
          'Reference_Geometry'
        ].map(name => `
          <button class="assembly" data-name="${name}">
            <span class="assembly-icon">⬡</span>
            <span>${name}</span>
            <span class="chevron">›</span>
          </button>
        `).join('')}
      </nav>

    </aside>

    <!-- CENTER VIEWPORT -->

    <section class="center">

      <div class="viewport-toolbar panel">
        <button class="tool active" title="Model">⬡</button>
        <button class="tool" title="Rotate">◎</button>
        <button class="tool" title="Orbit">◉</button>
        <button class="tool" title="Pan">⊙</button>
        <button class="tool" title="Zoom">⌕</button>
        <button class="tool" id="explode" title="Exploded View">♧</button>
        <button class="tool" id="wireframe" title="Wireframe">▧</button>
        <button class="tool" title="Lighting">☼</button>
        <button class="tool" id="reset" title="Reset View">↻</button>

        <span class="toolbar-divider"></span>

        <button class="tool" title="Settings">⚙</button>
        <button class="tool" title="Measure">◎</button>
        <button class="tool" title="Capture">▣</button>
        <button class="tool" title="Tools">⌁</button>
      </div>

      <div class="viewport panel" id="viewport">

        <div class="viewport-grid"></div>

        <div class="axis-cube">
          <div class="cube-top">TOP</div>
          <div class="cube-front">FRONT</div>
          <div class="cube-side">RIGHT</div>
          <span class="axis-x">X</span>
          <span class="axis-y">Y</span>
          <span class="axis-z">Z</span>
        </div>

        <div id="loading" class="loading">
          <span class="loader"></span>
          <span>LOADING VEHICLE MODEL</span>
        </div>

        <div id="model-error" class="model-error hidden">
          Could not load sedan.glb.
          Check that your file is in public/models/.
        </div>

        <div class="view-label">
          View <span>⌄</span>
        </div>

        <div class="viewport-footer">

          <div class="view-tools">
            <button title="Model view">⬡</button>
            <button title="Pan">✥</button>
            <button title="Settings">⚙</button>
            <button title="Camera">▣</button>
            <button title="Orbit">◉</button>
            <button title="Explode">♧</button>
            <button title="Measure">⌁</button>
          </div>

          <div class="model-stats">
            <span>Units: mm</span>
            <span>Scale: 1:1</span>
            <span id="triangle-count">Triangles: —</span>
          </div>

          <button id="fullscreen" class="fullscreen" title="Fullscreen">
            ⛶
          </button>

        </div>
      </div>
    </section>

    <!-- RIGHT PROPERTIES PANEL -->

    <aside class="properties panel">

      <div class="properties-heading">
        <span>PROPERTIES</span>
        <button id="close-properties">×</button>
      </div>

      <div class="property-section">

        <h4>General</h4>

        <div class="property-row">
          <span>Name</span>
          <span>Vehicle_Concept_v12</span>
        </div>

        <div class="property-row">
          <span>Type</span>
          <span>Assembly</span>
        </div>

        <div class="property-row">
          <span>Units</span>
          <span>Millimeters</span>
        </div>

      </div>

      <div class="property-section">

        <h4>Statistics</h4>

        <div class="property-row">
          <span>Parts</span>
          <span id="parts-count">—</span>
        </div>

        <div class="property-row">
          <span>Triangles</span>
          <span id="triangles-value">—</span>
        </div>

        <div class="property-row">
          <span>Materials</span>
          <span id="materials-count">—</span>
        </div>

      </div>

      <div class="property-section">

        <h4>Attributes</h4>

        <div class="property-row">
          <span>Variant</span>
          <span>Base_Design</span>
        </div>

        <div class="property-row">
          <span>Configuration</span>
          <span>A</span>
        </div>

        <div class="property-row">
          <span>Revision</span>
          <span>R12</span>
        </div>

      </div>

      <!-- MATERIAL AND APPEARANCE CUSTOMIZER -->

      <div class="property-section appearance-section">

        <h4>Material & Appearance</h4>

        <label class="appearance-label" for="body-color">
          Body Color
        </label>

        <div class="color-control">
          <input type="color" id="body-color" value="#087de0">
          <span id="color-value">#087DE0</span>
        </div>

        <label class="appearance-label" for="paint-finish">
          Paint Finish
        </label>

        <select id="paint-finish">
          <option value="glossy">Glossy</option>
          <option value="metallic" selected>Metallic</option>
          <option value="matte">Matte</option>
        </select>

        <div class="slider-heading">
          <label class="appearance-label" for="metallic-value">
            Metallic
          </label>
          <span id="metallic-number">75%</span>
        </div>

        <input
          class="appearance-slider"
          type="range"
          id="metallic-value"
          min="0"
          max="100"
          value="75"
        >

        <div class="slider-heading">
          <label class="appearance-label" for="roughness-value">
            Roughness
          </label>
          <span id="roughness-number">25%</span>
        </div>

        <input
          class="appearance-slider"
          type="range"
          id="roughness-value"
          min="0"
          max="100"
          value="25"
        >

        <button id="reset-appearance" class="reset-appearance">
          ↻ Restore Original
        </button>

      </div>

    </aside>

  </main>

  <footer class="statusbar">
    <span class="status-dot"></span>
    <span>System Ready</span>

    <span class="status-right">
      MorphDrive 3D <span>●</span> WebGL Active
    </span>
  </footer>

</div>
`;

// ============================================
// THREE.JS SCENE
// ============================================

const viewport = document.querySelector('#viewport');

const scene = new THREE.Scene();
scene.background = new THREE.Color('#020914');

const camera = new THREE.PerspectiveCamera(
  38,
  viewport.clientWidth / viewport.clientHeight,
  0.1,
  1000
);

camera.position.set(7, 4.2, 8);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false
});

renderer.setPixelRatio(
  Math.min(window.devicePixelRatio, 1.5)
);

renderer.setSize(
  viewport.clientWidth,
  viewport.clientHeight
);

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;

renderer.domElement.className = 'three-canvas';
viewport.prepend(renderer.domElement);

const controls = new OrbitControls(
  camera,
  renderer.domElement
);

controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.set(0, 0.8, 0);
controls.minDistance = 3;
controls.maxDistance = 18;

// ============================================
// LIGHTING
// ============================================

scene.add(
  new THREE.HemisphereLight(
    0x9bcfff,
    0x07111e,
    2
  )
);

const keyLight = new THREE.DirectionalLight(
  0x58baff,
  3
);

keyLight.position.set(5, 8, 6);
scene.add(keyLight);

const blueLight = new THREE.PointLight(
  0x008cff,
  35,
  18
);

blueLight.position.set(-4, 2, -3);
scene.add(blueLight);

// ============================================
// ENGINEERING FLOOR
// ============================================

const floor = new THREE.GridHelper(
  30,
  30,
  0x07518a,
  0x102c49
);

floor.position.y = 0;
scene.add(floor);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({
    color: 0x020914,
    roughness: 0.32,
    metalness: 0.55
  })
);

ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.04;
scene.add(ground);

// ============================================
// VEHICLE VARIABLES
// ============================================

let vehicle = null;

let originalMaterials = [];
let paintMaterials = [];

let exploded = false;
let wireframe = false;

let triangleTotal = 0;
let partTotal = 0;
let materialTotal = 0;

// ============================================
// LOAD GLB VEHICLE
// ============================================

const loader = new GLTFLoader();

loader.load(
  '/models/sedan.glb',

  (gltf) => {

    vehicle = gltf.scene;

    // Calculate model dimensions.

    const box = new THREE.Box3().setFromObject(vehicle);

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDimension = Math.max(
      size.x,
      size.y,
      size.z
    );

    const scale = 5 / maxDimension;

    vehicle.scale.setScalar(scale);

    vehicle.position.set(
      -center.x * scale,
      -box.min.y * scale,
      -center.z * scale
    );

    // Collect mesh and material information.

    const materialRecords = new Map();

    vehicle.traverse((object) => {

      if (!object.isMesh) return;

      partTotal++;

      const geometry = object.geometry;

      if (geometry.index) {
        triangleTotal += geometry.index.count / 3;
      } else if (geometry.attributes.position) {
        triangleTotal +=
          geometry.attributes.position.count / 3;
      }

      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];

      materials.forEach((mat) => {

        if (!materialRecords.has(mat)) {

          materialRecords.set(mat, {
            material: mat,

            originalColor: mat.color
              ? mat.color.clone()
              : null,

            originalMetalness: mat.metalness,
            originalRoughness: mat.roughness,
            originalWireframe: mat.wireframe,

            meshNames: [],
            materialName: (mat.name || '').toLowerCase()
          });

        }

        const record = materialRecords.get(mat);

        record.meshNames.push(
          (object.name || '').toLowerCase()
        );

      });

      object.castShadow = true;
      object.receiveShadow = true;

      // Save initial position for exploded view.

      object.userData.originalPosition =
        object.position.clone();

    });

    originalMaterials = [...materialRecords.values()];
    materialTotal = originalMaterials.length;

    // ========================================
    // IDENTIFY EXTERIOR BODY PAINT MATERIALS
    // ========================================

    const bodyKeywords = [
      'body',
      'paint',
      'exterior',
      'shell',
      'bonnet',
      'hood',
      'door',
      'fender',
      'bumper',
      'carbody'
    ];

    const excludedKeywords = [
      'glass',
      'window',
      'tire',
      'tyre',
      'rubber',
      'wheel',
      'rim',
      'light',
      'lamp',
      'chrome',
      'trim',
      'interior',
      'seat',
      'dashboard',
      'steering',
      'brake',
      'caliper'
    ];

    function isExcluded(entry) {

      const name = [
        entry.materialName,
        ...entry.meshNames
      ].join(' ');

      return excludedKeywords.some(
        keyword => name.includes(keyword)
      );

    }

    paintMaterials = originalMaterials.filter((entry) => {

      const name = [
        entry.materialName,
        ...entry.meshNames
      ].join(' ');

      return (
        bodyKeywords.some(keyword => name.includes(keyword)) &&
        !isExcluded(entry) &&
        entry.material.color
      );

    });

    // Fallback for models with generic material names.

    if (paintMaterials.length === 0) {

      paintMaterials = originalMaterials.filter((entry) => {

        const mat = entry.material;

        if (
          !mat.color ||
          mat.transparent ||
          mat.opacity < 0.95
        ) {
          return false;
        }

        if (isExcluded(entry)) return false;

        const color = mat.color;

        const brightness =
          (color.r + color.g + color.b) / 3;

        return brightness > 0.12;

      });

    }

    console.log(
      'MorphDrive: Vehicle loaded successfully.'
    );

    console.log(
      'MorphDrive: Detected paint materials:',
      paintMaterials.map(entry => ({
        material: entry.material.name,
        meshes: entry.meshNames
      }))
    );

    // Add vehicle to the scene.

    scene.add(vehicle);

    // Set initial camera position.

    controls.target.set(0, 1, 0);
    camera.position.set(7, 4.2, 8);
    controls.update();

    // Update loading status.

    document.querySelector('#loading')
      .classList.add('hidden');

    // Update vehicle statistics.

    document.querySelector('#parts-count').textContent =
      partTotal.toLocaleString();

    document.querySelector('#triangles-value').textContent =
      Math.round(triangleTotal).toLocaleString();

    document.querySelector('#materials-count').textContent =
      materialTotal.toLocaleString();

    document.querySelector('#triangle-count').textContent =
      `Triangles: ${Math.round(triangleTotal).toLocaleString()}`;

    // Enable appearance controls after loading.

    updatePaint();

  },

  undefined,

  (error) => {

    console.error(
      'MorphDrive: Vehicle loading failed:',
      error
    );

    document.querySelector('#loading')
      .classList.add('hidden');

    document.querySelector('#model-error')
      .classList.remove('hidden');

  }
);

// ============================================
// RESET CAMERA
// ============================================

document.querySelector('#reset').addEventListener(
  'click',
  () => {

    camera.position.set(7, 4.2, 8);

    controls.target.set(0, 1, 0);

    controls.update();

  }
);

// ============================================
// WIREFRAME MODE
// ============================================

document.querySelector('#wireframe').addEventListener(
  'click',
  (event) => {

    if (!vehicle) return;

    wireframe = !wireframe;

    vehicle.traverse((object) => {

      if (!object.isMesh) return;

      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];

      materials.forEach((mat) => {

        mat.wireframe = wireframe;
        mat.needsUpdate = true;

      });

    });

    event.currentTarget.classList.toggle(
      'active',
      wireframe
    );

  }
);

// ============================================
// EXPLODED VIEW
// ============================================

document.querySelector('#explode').addEventListener(
  'click',
  (event) => {

    if (!vehicle) return;

    exploded = !exploded;

    vehicle.traverse((object) => {

      if (!object.isMesh) return;

      const original =
        object.userData.originalPosition;

      if (!original) return;

      if (exploded) {

        const direction = object.position
          .clone()
          .add(object.parent.position)
          .normalize();

        object.position.copy(original).add(
          direction.multiplyScalar(0.35)
        );

      } else {

        object.position.copy(original);

      }

    });

    event.currentTarget.classList.toggle(
      'active',
      exploded
    );

  }
);

// ============================================
// FULLSCREEN
// ============================================

document.querySelector('#fullscreen').addEventListener(
  'click',
  () => {

    if (!document.fullscreenElement) {

      viewport.requestFullscreen?.();

    } else {

      document.exitFullscreen?.();

    }

  }
);

// ============================================
// PROPERTIES PANEL
// ============================================

document.querySelector('#close-properties')
  .addEventListener('click', () => {

    document.querySelector('.properties')
      .classList.toggle('collapsed');

  });

// ============================================
// MODEL BROWSER SELECTION
// ============================================

document.querySelectorAll('.assembly').forEach(
  (button) => {

    button.addEventListener('click', () => {

      document.querySelectorAll('.assembly').forEach(
        item => item.classList.remove('selected')
      );

      button.classList.add('selected');

    });

  }
);

// ============================================
// CAR APPEARANCE CUSTOMIZER
// ============================================

const colorPicker =
  document.querySelector('#body-color');

const colorValue =
  document.querySelector('#color-value');

const finishPicker =
  document.querySelector('#paint-finish');

const metallicSlider =
  document.querySelector('#metallic-value');

const roughnessSlider =
  document.querySelector('#roughness-value');

// Update the selected body paint.

function updatePaint() {

  if (!paintMaterials.length) return;

  const color = new THREE.Color(
    colorPicker.value
  );

  const metallic =
    Number(metallicSlider.value) / 100;

  const roughness =
    Number(roughnessSlider.value) / 100;

  paintMaterials.forEach((entry) => {

    const mat = entry.material;

    if (mat.color) {
      mat.color.copy(color);
    }

    if ('metalness' in mat) {
      mat.metalness = metallic;
    }

    if ('roughness' in mat) {
      mat.roughness = roughness;
    }

    mat.needsUpdate = true;

  });

  // Update displayed values.

  colorValue.textContent =
    colorPicker.value.toUpperCase();

  document.querySelector('#metallic-number')
    .textContent = `${metallicSlider.value}%`;

  document.querySelector('#roughness-number')
    .textContent = `${roughnessSlider.value}%`;

}

// Color picker.

colorPicker.addEventListener(
  'input',
  updatePaint
);

// Metallic slider.

metallicSlider.addEventListener(
  'input',
  updatePaint
);

// Roughness slider.

roughnessSlider.addEventListener(
  'input',
  updatePaint
);

// Paint finish presets.

finishPicker.addEventListener(
  'change',
  () => {

    const finish = finishPicker.value;

    if (finish === 'glossy') {

      roughnessSlider.value = 10;
      metallicSlider.value = 45;

    } else if (finish === 'metallic') {

      roughnessSlider.value = 25;
      metallicSlider.value = 90;

    } else if (finish === 'matte') {

      roughnessSlider.value = 85;
      metallicSlider.value = 0;

    }

    updatePaint();

  }
);

// Restore original vehicle materials.

document.querySelector('#reset-appearance')
  .addEventListener('click', () => {

    originalMaterials.forEach((entry) => {

      const mat = entry.material;

      if (entry.originalColor && mat.color) {

        mat.color.copy(entry.originalColor);

      }

      if (entry.originalMetalness !== undefined) {

        mat.metalness = entry.originalMetalness;

      }

      if (entry.originalRoughness !== undefined) {

        mat.roughness = entry.originalRoughness;

      }

      mat.wireframe = entry.originalWireframe;

      mat.needsUpdate = true;

    });

    // Restore customizer defaults.

    colorPicker.value = '#087de0';

    metallicSlider.value = 75;
    roughnessSlider.value = 25;

    finishPicker.value = 'metallic';

    colorValue.textContent = '#087DE0';

    document.querySelector('#metallic-number')
      .textContent = '75%';

    document.querySelector('#roughness-number')
      .textContent = '25%';

    // Reset wireframe button state.

    wireframe = false;

    document.querySelector('#wireframe')
      .classList.remove('active');

  });

// ============================================
// RESIZE HANDLING
// ============================================

function resize() {

  const width = viewport.clientWidth;
  const height = viewport.clientHeight;

  if (!width || !height) return;

  camera.aspect = width / height;

  camera.updateProjectionMatrix();

  renderer.setSize(width, height);

}

const observer = new ResizeObserver(resize);

observer.observe(viewport);

// ============================================
// RENDER LOOP
// ============================================

function animate() {

  requestAnimationFrame(animate);

  controls.update();

  renderer.render(scene, camera);

}

animate();
