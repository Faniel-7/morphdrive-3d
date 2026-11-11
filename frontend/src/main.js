import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createVehicleManager } from './vehicle-manager.js';
import { createHandController } from './hand-controller.js';

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
      <button id="help-toggle" type="button" title="Help" aria-label="Open help">?</button>
      <button title="Notifications">♧</button>
      <button class="profile">◉ <small>EN⌄</small></button>
    </div>
  </header>

  <section id="help-panel" class="help-panel hidden" role="dialog" aria-modal="true" aria-labelledby="help-title">
    <div class="help-dialog">
      <div class="help-panel-header">
        <div>
          <span class="help-eyebrow">MORPHDRIVE 3D</span>
          <h2 id="help-title">Controls &amp; Guide</h2>
        </div>
        <button id="help-close" type="button" aria-label="Close help">×</button>
      </div>

      <div class="help-content">
        <section class="help-section">
          <h3>VIEWPORT NAVIGATION</h3>
          <div class="help-row"><span>Rotate view</span><kbd>Left-click + drag</kbd></div>
          <div class="help-row"><span>Pan view</span><kbd>Right-click + drag</kbd></div>
          <div class="help-row"><span>Zoom</span><kbd>Mouse wheel</kbd></div>
          <div class="help-row"><span>Restore camera</span><kbd>Reset button ↻</kbd></div>
        </section>

        <section class="help-section">
          <h3>MODEL TOOLS</h3>
          <div class="help-row"><span>Exploded view</span><kbd>♧ Explode</kbd></div>
          <div class="help-row"><span>Wireframe display</span><kbd>▧ Wireframe</kbd></div>
          <div class="help-row"><span>Fullscreen viewport</span><kbd>⛶ Fullscreen</kbd></div>
        </section>

        <section class="help-section">
          <h3>APPEARANCE</h3>
          <p>Use the Properties panel to customize the vehicle's appearance.</p>
          <ul>
            <li>Choose a body color.</li>
            <li>Select Glossy, Metallic, or Matte finish.</li>
            <li>Adjust metallic and roughness values.</li>
            <li>Use Restore Original to reset the appearance.</li>
          </ul>
        </section>

        <section class="help-section">
          <h3>HAND INTERACTION</h3>
          <p>Press <strong>ENABLE HAND CONTROL</strong> to activate webcam-based hand tracking.</p>
          <p>Move your tracked hand to interact with vehicle parts. The status indicators show tracking and orientation information.</p>
          <p class="help-note">Hand interaction is experimental and requires camera permission.</p>
        </section>
      </div>

      <div class="help-panel-footer">
        <span>MORPHDRIVE 3D</span>
        <span>USER GUIDE · 01</span>
      </div>
    </div>
  </section>

  <main class="workspace">

    <aside class="browser panel">

      <div class="panel-heading">
        <span>MODEL BROWSER</span>
        <span class="blue">⛶</span>
      </div>

      <div class="model-name" id="active-model-heading">
        <span class="model-name-symbol">⬡</span>
        <span id="active-model-name">Sedan</span>
        <span>›</span>
      </div>

      <div class="vehicle-library">
        <label for="vehicle-select">VEHICLE MODEL</label>
        <select id="vehicle-select" aria-label="Choose a vehicle model">
          <option value="sedan">Sedan · Default model</option>
        </select>
        <div class="vehicle-library-actions">
          <button id="import-vehicle" type="button">＋ Import GLB</button>
          <input id="vehicle-file" type="file" accept=".glb,model/gltf-binary" hidden>
        </div>
        <small id="vehicle-library-status">1 model available · Import a GLB to add another</small>
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

        <div id="model-error" class="model-error hidden" role="alert">
          Could not load this vehicle. Check that the GLB file is valid and try again.
        </div>

        <div class="view-label">
          View <span>⌄</span>
        </div>

        <div class="hand-controls">
          <button id="start-hand-control" type="button">ENABLE HAND CONTROL</button>
          <span id="hand-status">3D HAND INITIALIZING...</span>
          <span id="hand-orientation">HAND: WAITING</span>
          <span id="hover-status">Hover over a vehicle part</span>
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

    <aside class="properties panel">

      <div class="properties-heading">
        <span>PROPERTIES</span>
        <button id="close-properties">×</button>
      </div>

      <div class="property-section">

        <h4>General</h4>

        <div class="property-row">
          <span>Name</span>
          <span id="property-model-name">Sedan</span>
        </div>

        <div class="property-row">
          <span>Type</span>
          <span id="property-model-type">Car</span>
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

const vehicleLibraryStyles = document.createElement('style');
vehicleLibraryStyles.textContent = `
  .vehicle-library {
    display: grid;
    gap: 7px;
    padding: 12px 13px 14px;
    border-bottom: 1px solid rgba(100, 160, 210, .13);
  }
  .vehicle-library > label {
    color: #79a9c9;
    font: 10px/1.2 monospace;
    letter-spacing: .11em;
  }
  .vehicle-library select {
    width: 100%;
    min-width: 0;
    padding: 8px 9px;
    color: #d9efff;
    background: rgba(4, 17, 32, .92);
    border: 1px solid rgba(54, 186, 255, .28);
    border-radius: 5px;
    font-family: inherit;
    font-size: 11px;
    line-height: 1.4;
  }
  .vehicle-library-actions { display: flex; }
  #import-vehicle {
    width: 100%;
    padding: 8px 10px;
    color: #8bdfff;
    background: rgba(0, 145, 220, .10);
    border: 1px solid rgba(54, 186, 255, .3);
    border-radius: 5px;
    cursor: pointer;
    font-family: inherit;
    font-size: 11px;
    line-height: 1.2;
  }
  #import-vehicle:hover:not(:disabled) {
    background: rgba(0, 145, 220, .2);
    border-color: rgba(54, 186, 255, .65);
  }
  #import-vehicle:disabled, #vehicle-select:disabled {
    opacity: .55;
    cursor: wait;
  }
  #vehicle-library-status {
    color: #7792a8;
    font-family: inherit;
    font-size: 10px;
    line-height: 1.4;
  }
  #active-model-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;
document.head.append(vehicleLibraryStyles);

const viewport = document.querySelector('#viewport');

const helpPanel = document.querySelector('#help-panel');
const helpToggle = document.querySelector('#help-toggle');
const helpClose = document.querySelector('#help-close');

function openHelp() {
  helpPanel.classList.remove('hidden');
  helpClose.focus();
}

function closeHelp() {
  helpPanel.classList.add('hidden');
  helpToggle.focus();
}

helpToggle.addEventListener('click', openHelp);
helpClose.addEventListener('click', closeHelp);

document.addEventListener('pointerdown', event => {
  if (
    !helpPanel.classList.contains('hidden') &&
    !helpPanel.contains(event.target)
  ) {
    closeHelp();
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !helpPanel.classList.contains('hidden')) {
    closeHelp();
  }
});

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
  alpha: false,
  powerPreference: 'low-power'
});

// Keep rendering lightweight on integrated GPUs while retaining enough
// resolution for a clear vehicle preview.
renderer.setPixelRatio(
  Math.min(window.devicePixelRatio || 1, 1.25)
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

const orientationStatus =
  document.querySelector('#hand-orientation');

const handController = createHandController({
  scene,
  camera,
  viewport
});

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

let vehicle = null;

let originalMaterials = [];
let paintMaterials = [];

let exploded = false;
let wireframe = false;

let triangleTotal = 0;
let partTotal = 0;
let materialTotal = 0;

const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
const hoverTestPoints = [];
const hoverRaycastHits = [];
const previousHoverPointers = [];

const HOVER_UPDATE_INTERVAL = 1000 / 30;
const HOVER_POINTER_EPSILON_SQ = 0.000004;

let lastHoverUpdate = -Infinity;
let hoverDirty = true;
let pointerActive = false;
let hoveredMesh = null;
let hoveredOriginalMaterial = null;
let hoveredHighlightMaterial = null;

function restoreHoveredMesh() {
  if (!hoveredMesh) return;

  hoveredMesh.material = hoveredOriginalMaterial;

  if (Array.isArray(hoveredHighlightMaterial)) {
    hoveredHighlightMaterial.forEach(material => material.dispose());
  } else {
    hoveredHighlightMaterial?.dispose();
  }

  hoveredMesh = null;
  hoveredOriginalMaterial = null;
  hoveredHighlightMaterial = null;
}

function setHoveredMesh(mesh) {
  if (mesh === hoveredMesh) return;

  restoreHoveredMesh();

  if (!mesh) {
    document.querySelector('#hover-status').textContent =
      'Hover over a vehicle part';
    return;
  }

  hoveredMesh = mesh;
  hoveredOriginalMaterial = mesh.material;

  if (Array.isArray(mesh.material)) {
    hoveredHighlightMaterial = mesh.material.map(material => {
      const clone = material.clone();

      if (clone.emissive) {
        clone.emissive.set(0x00cfff);
        clone.emissiveIntensity = 0.85;
      } else if (clone.color) {
        clone.color.lerp(new THREE.Color(0x00cfff), 0.35);
      }

      return clone;
    });
  } else {
    hoveredHighlightMaterial = mesh.material.clone();

    if (hoveredHighlightMaterial.emissive) {
      hoveredHighlightMaterial.emissive.set(0x00cfff);
      hoveredHighlightMaterial.emissiveIntensity = 0.85;
    } else if (hoveredHighlightMaterial.color) {
      hoveredHighlightMaterial.color.lerp(
        new THREE.Color(0x00cfff),
        0.35
      );
    }
  }

  mesh.material = hoveredHighlightMaterial;

  let label = mesh.name || 'Vehicle component';
  let parent = mesh.parent;

  while (
    parent &&
    parent !== vehicle &&
    (!label || /^mesh|object|primitive/i.test(label))
  ) {
    if (parent.name) label = parent.name;
    parent = parent.parent;
  }

  document.querySelector('#hover-status').textContent =
    `HOVER: ${label.replace(/[_-]+/g, ' ')}`;
}

function updateVehicleHover(now, cameraChanged = false) {
  if (!vehicle) return;

  // Sample tracked pointers at 30 Hz rather than allocating and raycasting
  // on every render frame. Mouse movement refreshes immediately; camera
  // movement is checked at the same 30 Hz limit.
  if (
    !hoverDirty &&
    now - lastHoverUpdate < HOVER_UPDATE_INTERVAL
  ) {
    return;
  }

  const trackedPointers = handController.getTrackedPointers();
  hoverTestPoints.length = 0;

  for (const point of trackedPointers) {
    if (
      point.x >= -1 && point.x <= 1 &&
      point.y >= -1 && point.y <= 1
    ) {
      hoverTestPoints.push(point);
    }
  }

  let pointersChanged =
    hoverTestPoints.length !== previousHoverPointers.length;

  if (!pointersChanged) {
    for (let i = 0; i < hoverTestPoints.length; i++) {
      if (
        hoverTestPoints[i].distanceToSquared(previousHoverPointers[i]) >
        HOVER_POINTER_EPSILON_SQ
      ) {
        pointersChanged = true;
        break;
      }
    }
  }

  if (pointersChanged) {
    previousHoverPointers.length = 0;

    for (const point of hoverTestPoints) {
      previousHoverPointers.push(point.clone());
    }
  }

  lastHoverUpdate = now;

  if (!hoverDirty && !cameraChanged && !pointersChanged) {
    return;
  }

  hoverDirty = false;
  camera.updateMatrixWorld(true);

  // If no fingertip is currently inside the viewport, keep mouse hover usable.
  if (hoverTestPoints.length === 0 && pointerActive) {
    hoverTestPoints.push(pointerNdc);
  }

  let nearestHit = null;

  for (const point of hoverTestPoints) {
    raycaster.setFromCamera(point, camera);

    hoverRaycastHits.length = 0;
    raycaster.intersectObject(vehicle, true, hoverRaycastHits);

    const hit = hoverRaycastHits.find(item => item.object.isMesh);

    if (hit && (!nearestHit || hit.distance < nearestHit.distance)) {
      nearestHit = hit;
    }
  }

  setHoveredMesh(nearestHit?.object || null);
}

renderer.domElement.addEventListener('pointermove', event => {
  const rect = renderer.domElement.getBoundingClientRect();

  pointerNdc.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );

  pointerActive = true;
  hoverDirty = true;
});

renderer.domElement.addEventListener('pointerleave', () => {
  pointerActive = false;
  hoverDirty = true;

  if (!handController.getTrackedHands().length) {
    setHoveredMesh(null);
  }
});
const loadingPanel = document.querySelector('#loading');
const loadingMessage = document.querySelector('#loading span:last-child');
const modelError = document.querySelector('#model-error');
const vehicleSelect = document.querySelector('#vehicle-select');
const importVehicleButton = document.querySelector('#import-vehicle');
const vehicleFileInput = document.querySelector('#vehicle-file');
const vehicleLibraryStatus = document.querySelector('#vehicle-library-status');
const activeModelName = document.querySelector('#active-model-name');

let vehicleManager;

function setVehicleLoading(isLoading, message = 'LOADING VEHICLE MODEL...') {
  loadingPanel.classList.toggle('hidden', !isLoading);
  modelError.classList.add('hidden');
  loadingMessage.textContent = message;
  vehicleSelect.disabled = isLoading;
  importVehicleButton.disabled = isLoading;
}

function updateVehicleCatalogOptions(selectedId = '') {
  const models = vehicleManager.getCatalog();
  vehicleSelect.replaceChildren();

  for (const model of models) {
    const option = document.createElement('option');
    option.value = model.id;
    option.textContent = `${model.name} · ${model.type}`;
    vehicleSelect.append(option);
  }

  if (selectedId) vehicleSelect.value = selectedId;
  vehicleLibraryStatus.textContent =
    `${models.length} model${models.length === 1 ? '' : 's'} available · Import a GLB to add another`;
}

function resetVehicleInteractionState() {
  restoreHoveredMesh();
  exploded = false;
  wireframe = false;
  document.querySelector('#explode').classList.remove('active');
  document.querySelector('#wireframe').classList.remove('active');
  hoverTestPoints.length = 0;
  previousHoverPointers.length = 0;
  hoverDirty = true;
}

function initializeVehicle(root, model) {
  vehicle = root;
  resetVehicleInteractionState();

  triangleTotal = 0;
  partTotal = 0;
  materialTotal = 0;
  originalMaterials = [];
  paintMaterials = [];

  const materialRecords = new Map();

  vehicle.traverse(object => {
    if (!object.isMesh) return;

    partTotal++;
    const geometry = object.geometry;

    if (geometry?.index) {
      triangleTotal += geometry.index.count / 3;
    } else if (geometry?.attributes?.position) {
      triangleTotal += geometry.attributes.position.count / 3;
    }

    const materials = Array.isArray(object.material)
      ? object.material
      : object.material
        ? [object.material]
        : [];

    for (const material of materials) {
      if (!materialRecords.has(material)) {
        materialRecords.set(material, {
          material,
          originalColor: material.color ? material.color.clone() : null,
          originalMetalness: material.metalness,
          originalRoughness: material.roughness,
          originalWireframe: material.wireframe,
          meshNames: [],
          materialName: (material.name || '').toLowerCase()
        });
      }

      materialRecords.get(material).meshNames.push(
        (object.name || '').toLowerCase()
      );
    }

    object.castShadow = true;
    object.receiveShadow = true;
    object.userData.originalPosition = object.position.clone();
  });

  originalMaterials = [...materialRecords.values()];
  materialTotal = originalMaterials.length;

  const bodyKeywords = [
    'body', 'paint', 'exterior', 'shell', 'bonnet', 'hood',
    'door', 'fender', 'bumper', 'carbody'
  ];

  const excludedKeywords = [
    'glass', 'window', 'tire', 'tyre', 'rubber', 'wheel',
    'rim', 'light', 'lamp', 'chrome', 'trim', 'interior',
    'seat', 'dashboard', 'steering', 'brake', 'caliper'
  ];

  function isExcluded(entry) {
    const name = [entry.materialName, ...entry.meshNames].join(' ');
    return excludedKeywords.some(keyword => name.includes(keyword));
  }

  paintMaterials = originalMaterials.filter(entry => {
    const name = [entry.materialName, ...entry.meshNames].join(' ');
    return bodyKeywords.some(keyword => name.includes(keyword)) &&
      !isExcluded(entry) && entry.material.color;
  });

  if (paintMaterials.length === 0) {
    paintMaterials = originalMaterials.filter(entry => {
      const material = entry.material;
      if (!material.color || material.transparent || material.opacity < 0.95) {
        return false;
      }
      if (isExcluded(entry)) return false;
      const color = material.color;
      const brightness = (color.r + color.g + color.b) / 3;
      return brightness > 0.12;
    });
  }

  activeModelName.textContent = model.name;
  document.querySelector('#property-model-name').textContent = model.name;
  document.querySelector('#property-model-type').textContent = model.type;
  document.querySelector('#parts-count').textContent = partTotal.toLocaleString();
  document.querySelector('#triangles-value').textContent =
    Math.round(triangleTotal).toLocaleString();
  document.querySelector('#materials-count').textContent =
    materialTotal.toLocaleString();
  document.querySelector('#triangle-count').textContent =
    `Triangles: ${Math.round(triangleTotal).toLocaleString()}`;
  document.querySelector('#hover-status').textContent =
    'Hover over a vehicle part';

  controls.target.set(0, 1, 0);
  camera.position.set(7, 4.2, 8);
  controls.update();
  hoverDirty = true;

  updatePaint();

  console.info(`MorphDrive: ${model.name} loaded.`, {
    parts: partTotal,
    triangles: Math.round(triangleTotal),
    materials: materialTotal,
    paintMaterials: paintMaterials.length
  });
}

vehicleManager = createVehicleManager({
  scene,
  targetSize: 5,
  onBeforeReplace: () => {
    resetVehicleInteractionState();
  },
  onProgress: (event, model) => {
    if (event.phase === 'start') {
      setVehicleLoading(true, `LOADING ${model.name.toUpperCase()}...`);
      return;
    }

    if (event.phase === 'complete') {
      loadingMessage.textContent = `${model.name.toUpperCase()} READY`;
      return;
    }

    if (event.lengthComputable && event.total > 0) {
      const percent = Math.round((event.loaded / event.total) * 100);
      loadingMessage.textContent = `LOADING ${model.name.toUpperCase()} ${percent}%`;
    } else {
      loadingMessage.textContent = `LOADING ${model.name.toUpperCase()}...`;
    }
  }
});

vehicleManager.registerModel({
  id: 'sedan',
  name: 'Sedan',
  type: 'Car',
  url: '/models/sedan.glb'
});

async function activateVehicle(id) {
  try {
    const result = await vehicleManager.loadModel(id);
    initializeVehicle(result.root, result.model);
    updateVehicleCatalogOptions(result.model.id);
    setVehicleLoading(false);
  } catch (error) {
    if (error?.name === 'AbortError') return;

    console.error('MorphDrive: Vehicle loading failed:', error);
    loadingPanel.classList.add('hidden');
    modelError.textContent = error?.message
      ? `Could not load vehicle: ${error.message}`
      : 'Could not load this vehicle. Check that the GLB file is valid and try again.';
    modelError.classList.remove('hidden');
    vehicleSelect.value = vehicleManager.getActiveModel()?.id || 'sedan';
    vehicleSelect.disabled = false;
    importVehicleButton.disabled = false;
  }
}

vehicleSelect.addEventListener('change', event => {
  activateVehicle(event.currentTarget.value);
});

importVehicleButton.addEventListener('click', () => {
  vehicleFileInput.click();
});

vehicleFileInput.addEventListener('change', async event => {
  const file = event.currentTarget.files?.[0];
  if (!file) return;

  try {
    setVehicleLoading(true, `IMPORTING ${file.name.toUpperCase()}...`);
    const result = await vehicleManager.importFile(file);
    initializeVehicle(result.root, result.model);
    updateVehicleCatalogOptions(result.model.id);
    setVehicleLoading(false);
  } catch (error) {
    if (error?.name === 'AbortError') return;

    console.error('MorphDrive: Vehicle import failed:', error);
    loadingPanel.classList.add('hidden');
    modelError.textContent = error?.message || 'Could not import this GLB file.';
    modelError.classList.remove('hidden');
    vehicleSelect.disabled = false;
    importVehicleButton.disabled = false;
  } finally {
    // Allow selecting the same file again after a failed import.
    vehicleFileInput.value = '';
  }
});

updateVehicleCatalogOptions('sedan');
activateVehicle('sedan');

document.querySelector('#reset').addEventListener(
  'click',
  () => {

    camera.position.set(7, 4.2, 8);

    controls.target.set(0, 1, 0);

    controls.update();

  }
);

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

document.querySelector('#close-properties')
  .addEventListener('click', () => {

    document.querySelector('.properties')
      .classList.toggle('collapsed');

  });

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

  colorValue.textContent =
    colorPicker.value.toUpperCase();

  document.querySelector('#metallic-number')
    .textContent = `${metallicSlider.value}%`;

  document.querySelector('#roughness-number')
    .textContent = `${roughnessSlider.value}%`;

}

colorPicker.addEventListener(
  'input',
  updatePaint
);

metallicSlider.addEventListener(
  'input',
  updatePaint
);

roughnessSlider.addEventListener(
  'input',
  updatePaint
);

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

    colorPicker.value = '#087de0';

    metallicSlider.value = 75;
    roughnessSlider.value = 25;

    finishPicker.value = 'metallic';

    colorValue.textContent = '#087DE0';

    document.querySelector('#metallic-number')
      .textContent = '75%';

    document.querySelector('#roughness-number')
      .textContent = '25%';

    wireframe = false;

    document.querySelector('#wireframe')
      .classList.remove('active');

  });

function resize() {

  const width = viewport.clientWidth;
  const height = viewport.clientHeight;

  if (!width || !height) return;

  camera.aspect = width / height;

  camera.updateProjectionMatrix();

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, 1.25)
  );

  renderer.setSize(width, height);
  hoverDirty = true;

}

const observer = new ResizeObserver(resize);

observer.observe(viewport);

function animate(now = 0) {

  requestAnimationFrame(animate);

  const cameraChanged = controls.update();
  updateVehicleHover(now, cameraChanged);

  renderer.render(scene, camera);

}

animate();

function disposeSceneResources(root) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();

  root.traverse((object) => {
    if (object.geometry) {
      geometries.add(object.geometry);
    }

    const objectMaterials = Array.isArray(object.material)
      ? object.material
      : object.material
        ? [object.material]
        : [];

    for (const material of objectMaterials) {
      if (!material) continue;

      materials.add(material);

      for (const value of Object.values(material)) {
        if (value?.isTexture) {
          textures.add(value);
        }
      }
    }
  });

  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
}

window.addEventListener('pagehide', (event) => {
  handController.stop();
  restoreHoveredMesh();

  // Do not destroy the renderer when the browser is placing this page
  // into the back-forward cache; the page may be restored.
  if (event.persisted) return;

  observer.disconnect();
  controls.dispose();
  vehicleManager.dispose();
  disposeSceneResources(scene);
  renderer.dispose();
  renderer.domElement.remove();
}, { once: true });