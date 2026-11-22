    import './style.css';
    import * as THREE from 'three';
import { createVehicleScanner } from './vehicle-scanning/vehicle-scanner.js';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { createVehicleManager } from '../vehicle-manager.js';
    import { createHandController } from './hand-controller.js';
import { createGestureRecognizer } from './gesture-recognition.js';
    import './showroom/showroom.css';
    import { createShowroom } from './showroom/showroom.js';
    import { VEHICLE_CATALOG } from './showroom/vehicle-catalog.js';
    import { createExplosionManager } from './vehicle-explosion/explosion-manager.js';
import { createCockpitCamera } from './cockpit-mode/cockpit-camera.js';
import {
  diagnoseSkinnedComponents,
  createBoneMovementTester
} from './vehicle-explosion/component-diagnostic.js';

    document.querySelector('#app').innerHTML = `
    <div class="cockpit">

      <header class="topbar">
        <div class="brand">
          <span class="brand-mark">⬡</span>
          <strong>MORPHDRIVE</strong>
        </div>

        <div class="app-name">3D Vehicle Studio</div>

        <div class="top-actions">
          <button id="toggle-browser" class="topbar-action" type="button" title="Show or hide the vehicle browser" aria-expanded="true">Vehicles</button>
          <button id="toggle-properties" class="topbar-action" type="button" title="Show or hide vehicle properties" aria-expanded="true">Properties</button>
          <button id="help-toggle" class="topbar-action help-action" type="button" title="Show controls and help" aria-label="Open help">Help</button>
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
              <div class="help-row"><span>Restore camera</span><kbd>Reset view</kbd></div>
              <p>Adjust rotation, pan, and zoom sensitivity in the Properties panel.</p>
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
            <span>VEHICLES</span>
            <span class="panel-hint">MODEL LIBRARY</span>
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

        </aside>

        <section class="center">

          <div class="viewport-toolbar panel" aria-label="Vehicle and camera tools">
            <div class="toolbar-group">
              <button class="tool tool-primary" id="explode" type="button" title="Toggle exploded view" aria-label="Toggle exploded view">
                <span class="tool-icon">⤢</span><span class="tool-label">Explode</span>
              </button>
              <button class="tool tool-scan" id="scan-vehicle"
                type="button"
                title="Start vehicle scanning"
                aria-label="Start vehicle scanning"
                aria-pressed="false">
                <span class="tool-icon">⌁</span>
                <span class="tool-label">Scan</span>
              </button>
              <button class="tool" id="wireframe" type="button" title="Toggle wireframe display" aria-label="Toggle wireframe display">
                <span class="tool-icon">▧</span><span class="tool-label">Wireframe</span>
              </button>
              <button class="tool" id="reset" type="button" title="Reset camera position and target" aria-label="Reset camera view">
                <span class="tool-icon">↺</span><span class="tool-label">Reset view</span>
              </button>
              <button class="tool" id="front-seat" type="button"
                title="Move camera to the driver's seat"
                aria-label="Move camera to front seat"
                aria-pressed="false">
                <span class="tool-icon">◉</span><span class="tool-label">Front Seat</span>
              </button>
            </div>
            <span class="toolbar-note">Drag to rotate · Right-drag to pan · Scroll to zoom</span>
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

            <div id="component-tooltip" class="component-tooltip" role="status" aria-live="polite" hidden></div>

            <div class="hand-controls">
              <button id="start-hand-control" type="button">ENABLE HAND CONTROL</button>
              <span id="hand-status">3D HAND INITIALIZING...</span>
              <span id="hand-orientation">HAND: WAITING</span>
              <span id="gesture-status">GESTURE: WAITING</span>
              <span id="hover-status">Hover over a vehicle part</span>
            </div>

            <div class="viewport-footer">

              <div class="model-stats">
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
            <button id="close-properties" type="button" title="Hide properties panel" aria-label="Hide properties panel">×</button>
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



          <div class="property-section camera-settings-section">
            <h4>Camera controls</h4>
            <p class="camera-hint">Left-drag: rotate · Right-drag: pan · Wheel: zoom</p>

            <div class="slider-heading">
              <label class="appearance-label" for="camera-rotate-speed">Rotation speed</label>
              <span id="camera-rotate-number">0.8×</span>
            </div>
            <input class="appearance-slider" type="range" id="camera-rotate-speed" min="0.2" max="2.5" step="0.1" value="0.8">

            <div class="slider-heading">
              <label class="appearance-label" for="camera-pan-speed">Pan speed</label>
              <span id="camera-pan-number">0.8×</span>
            </div>
            <input class="appearance-slider" type="range" id="camera-pan-speed" min="0.2" max="2.5" step="0.1" value="0.8">

            <div class="slider-heading">
              <label class="appearance-label" for="camera-zoom-speed">Zoom speed</label>
              <span id="camera-zoom-number">1.0×</span>
            </div>
            <input class="appearance-slider" type="range" id="camera-zoom-speed" min="0.2" max="2.5" step="0.1" value="1.0">
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

    const cockpit = document.querySelector('.cockpit');

const backToShowroomButton = document.createElement('button');
backToShowroomButton.id = 'back-to-showroom';
backToShowroomButton.type = 'button';
backToShowroomButton.className = 'showroom-back-button';
backToShowroomButton.textContent = '← SHOWROOM';

document.querySelector('.top-actions').prepend(backToShowroomButton);

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

    const scanButton = document.querySelector('#scan-vehicle');

    const vehicleScanner = createVehicleScanner({
      scene,
      onStateChange: state => {
        if (!scanButton) return;

        const scanning = state === 'scanning';

        scanButton.classList.toggle('active', scanning);
        scanButton.setAttribute('aria-pressed', String(scanning));

        scanButton.querySelector('.tool-label').textContent =
          scanning ? 'Scanning...' : 'Scan';

        scanButton.title = scanning
          ? 'Stop vehicle scanning'
          : 'Start vehicle scanning';
      }
    });
    scene.background = new THREE.Color('#020914');

    const camera = new THREE.PerspectiveCamera(
      38,
      viewport.clientWidth / viewport.clientHeight,
      0.01,
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
    // Allow the camera to move through the vehicle shell and into the cabin.
    controls.minDistance = 0.05;
    controls.maxDistance = 18;
    controls.enableRotate = true;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.rotateSpeed = 1.15;
    controls.panSpeed = 0.9;
    controls.zoomSpeed = 1.0;
    // Allow a full 360-degree orbit, including looking almost straight up/down.
    controls.minPolarAngle = 0.001;
    controls.maxPolarAngle = Math.PI - 0.001;
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity;
    controls.screenSpacePanning = true;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };

    // Camera sensitivity controls change only OrbitControls; they do not
    // alter the vehicle, explosion system, or hand-tracking controller.
    const cameraSpeedControls = [
      { input: '#camera-rotate-speed', output: '#camera-rotate-number', property: 'rotateSpeed' },
      { input: '#camera-pan-speed', output: '#camera-pan-number', property: 'panSpeed' },
      { input: '#camera-zoom-speed', output: '#camera-zoom-number', property: 'zoomSpeed' }
    ];

    cameraSpeedControls.forEach(({ input, output, property }) => {
      const slider = document.querySelector(input);
      const valueLabel = document.querySelector(output);
      slider.addEventListener('input', () => {
        const value = Number(slider.value);
        controls[property] = value;
        valueLabel.textContent = `${value.toFixed(1)}×`;
      });
    });

    const orientationStatus =
      document.querySelector('#hand-orientation');

    const handController = createHandController({
      scene,
      camera,
      viewport
    });

    // Gesture recognition reuses landmarks from the existing MediaPipe
    // detector. It does not create another camera or detector.
    const gestureRecognizer = createGestureRecognizer({
      holdDuration: 300
    });
    const gestureStatus = document.querySelector('#gesture-status');

    const gestureActionState = {
      previousStable: new Map(),
      actionTimes: new Map(),
      previousPalmCenter: null
    };

    function gestureActionReady(action, now, cooldown = 1000) {
      const previous = gestureActionState.actionTimes.get(action) ?? -Infinity;

      if (now - previous < cooldown) return false;

      gestureActionState.actionTimes.set(action, now);
      return true;
    }

    scene.add(
      new THREE.HemisphereLight(
        0x9bcfff,
        0x07111e,
        2.6
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

    // Soft underbody fill: placed just above the floor to lift dark lower surfaces.
    const underbodyLight = new THREE.PointLight(0x4aaeff, 24, 11, 2);
    underbodyLight.position.set(0, 0.38, 0);
    scene.add(underbodyLight);

// Additional neutral fill lighting from multiple directions.
const fillLights = [
  {
    color: 0xe4f3ff,
    intensity: 1.8,
    position: [-6, 5, 5]
  },
  {
    color: 0xffffff,
    intensity: 1.5,
    position: [6, 4, 4]
  },
  {
    color: 0xb8dfff,
    intensity: 1.7,
    position: [-5, 3, -5]
  },
  {
    color: 0xffffff,
    intensity: 1.4,
    position: [5, 5, -5]
  },
  {
    color: 0xd5eaff,
    intensity: 1.2,
    position: [0, 8, 0]
  }
];

for (const fill of fillLights) {
  const light = new THREE.DirectionalLight(
    fill.color,
    fill.intensity
  );

  light.position.set(...fill.position);
  scene.add(light);
}


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

    const showroomStage = new THREE.Group();

const stageBase = new THREE.Mesh(
  new THREE.CylinderGeometry(3.3, 3.55, 0.22, 48),
  new THREE.MeshStandardMaterial({
    color: 0x071a2b,
    metalness: 0.82,
    roughness: 0.3,
    emissive: 0x03182b,
    emissiveIntensity: 0.7
  })
);

stageBase.position.y = -0.18;
stageBase.receiveShadow = true;
showroomStage.add(stageBase);

const stageTopRing = new THREE.Mesh(
  new THREE.TorusGeometry(3.28, 0.025, 8, 64),
  new THREE.MeshBasicMaterial({
    color: 0x168fff,
    transparent: true,
    opacity: 0.8
  })
);

stageTopRing.rotation.x = Math.PI / 2;
stageTopRing.position.y = -0.045;
showroomStage.add(stageTopRing);

const stageInnerRing = new THREE.Mesh(
  new THREE.TorusGeometry(2.95, 0.012, 6, 64),
  new THREE.MeshBasicMaterial({
    color: 0x56bdff,
    transparent: true,
    opacity: 0.38
  })
);

stageInnerRing.rotation.x = Math.PI / 2;
stageInnerRing.position.y = -0.04;
showroomStage.add(stageInnerRing);

scene.add(showroomStage);

    let vehicle = null;
    let showroomMode = true;
let activePreviewId = null;

    let activeVehicleId = null;
    let explosionManager = null;

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
    // MORPHDRIVE: Kawasaki component collection
window.kawasakiHoverReport = [];

window.exportKawasakiHoverReport = function () {
  const report = window.kawasakiHoverReport;

  const blob = new Blob(
    [JSON.stringify(report, null, 2)],
    { type: 'application/json' }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'kawasaki-hover-report.json';
  link.click();

  URL.revokeObjectURL(url);

  console.log(`Exported ${report.length} hover records.`);
};
    let hoveredOriginalMaterial = null;
    let hoveredHighlightMaterial = null;

    function restoreHoveredMesh() {
      if (!hoveredMesh) return;

      hoveredMesh.material =
        hoveredMesh === selectedInspectionMesh
          ? selectedHighlightMaterial
          : hoveredOriginalMaterial;

      if (Array.isArray(hoveredHighlightMaterial)) {
        hoveredHighlightMaterial.forEach(material => material.dispose());
      } else {
        hoveredHighlightMaterial?.dispose();
      }

      hoveredMesh = null;
      hoveredOriginalMaterial = null;
      hoveredHighlightMaterial = null;
    }

    const componentTooltip = document.querySelector('#component-tooltip');

    function positionComponentTooltip(worldPoint) {
      if (!componentTooltip || !worldPoint) {
        if (componentTooltip) componentTooltip.hidden = true;
        return;
      }

      const projected = worldPoint.clone().project(camera);
      if (projected.z < -1 || projected.z > 1) {
        componentTooltip.hidden = true;
        return;
      }

      const x = (projected.x * 0.5 + 0.5) * viewport.clientWidth;
      const y = (-projected.y * 0.5 + 0.5) * viewport.clientHeight;
      componentTooltip.style.left = `${x}px`;
      componentTooltip.style.top = `${y - 14}px`;
      componentTooltip.hidden = false;
    }

    function setHoveredMesh(mesh, worldPoint = null) {
      if (mesh === hoveredMesh) {
        positionComponentTooltip(worldPoint);
        return;
      }

      restoreHoveredMesh();

      if (!mesh) {
        document.querySelector('#hover-status').textContent =
          'Hover over a vehicle part';
        positionComponentTooltip(null);
        return;
      }

      hoveredMesh = mesh;
      if (activeVehicleId === 'kawasaki-ninja-h2') {
  const hierarchy = [];
  let current = mesh;

  while (current && current !== vehicle) {
    let meshCount = 0;

    current.traverse(child => {
      if (child.isMesh || child.isSkinnedMesh) meshCount++;
    });

    hierarchy.unshift({
      name: current.name,
      type: current.type,
      uuid: current.uuid,
      meshCount
    });

    current = current.parent;
  }

  window.kawasakiHoverReport.push({
    time: new Date().toISOString(),
    meshName: mesh.name,
    meshUUID: mesh.uuid,
    hierarchy
  });
}
      // MORPHDRIVE: Detailed hovered-object hierarchy diagnostic.
const hoverHierarchy = [];
let currentObject = mesh;

while (currentObject && currentObject !== vehicle) {
  let meshCount = 0;

  currentObject.traverse(child => {
    if (child.isMesh || child.isSkinnedMesh) {
      meshCount++;
    }
  });

  hoverHierarchy.unshift({
    name: currentObject.name || '(unnamed)',
    type: currentObject.type,
    uuid: currentObject.uuid,
    meshCount,
    visible: currentObject.visible
  });

  currentObject = currentObject.parent;
}

console.group(
  `[MORPHDRIVE HOVER] ${mesh.name || 'Unnamed Mesh'}`
);

console.table(hoverHierarchy);

console.log('Detected mesh:', mesh);
console.log('Object hierarchy:', hoverHierarchy);

console.groupEnd();
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

      const readableLabel = label.replace(/[_-]+/g, ' ');
      document.querySelector('#hover-status').textContent =
        `HOVER: ${readableLabel}`;
      componentTooltip.textContent = readableLabel;
      positionComponentTooltip(worldPoint);
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

      setHoveredMesh(nearestHit?.object || null, nearestHit?.point || null);
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
  console.log('INITIALIZE VEHICLE FUNCTION STARTED');

  // Restore the previous non-Sedan vehicle before replacing it.
  if (explosionManager) {
    explosionManager.dispose();
    explosionManager = null;
  }

  vehicle = root;
  vehicleScanner.setVehicle(root);

  // TEMPORARY: Inspect every renderable mesh in the loaded vehicle.
  window.inspectMorphDriveMeshes = function () {
    if (!vehicle) {
      console.warn('No vehicle is currently loaded.');
      return [];
    }

    const records = [];

    vehicle.updateMatrixWorld(true);

    vehicle.traverse(object => {
      if (!object.isMesh) return;

      const ancestors = [];
      let current = object;

      while (current) {
        ancestors.unshift(current.name || current.type);
        current = current.parent;
      }

      let component = object;

      while (
        component.parent &&
        component.parent !== vehicle &&
        component.parent.name !== 'RootNode_2'
      ) {
        component = component.parent;
      }

      records.push({
        mesh: object.name,
        component: component.parent?.name === 'RootNode_2'
          ? component.name
          : component.name,
        parent: object.parent?.name || '(none)',
        skinned: object.isSkinnedMesh,
        visible: object.visible,
        vertices: object.geometry?.attributes?.position?.count || 0,
        path: ancestors.join(' / ')
      });
    });

    console.group('MorphDrive: Complete vehicle mesh inventory');
    console.log('Total renderable meshes:', records.length);
    console.table(records);
    console.groupEnd();

    return records;
  };
  exploded = false;

  resetVehicleInteractionState();

  document.querySelector('#explode')?.classList.remove('active');

  // The Sedan retains its original, specialized explosion system.
  // All other vehicles use the reusable explosion manager.
  if (activeVehicleId && activeVehicleId !== 'sedan') {
    console.group(`MorphDrive Component Diagnostic: ${activeVehicleId}`);
    const rigReport = diagnoseSkinnedComponents(vehicle);

    if (activeVehicleId === 'honda-cbr650r') {
      window.__morphDriveHondaRigReport = rigReport;
      window.__morphDriveBoneTest = createBoneMovementTester(vehicle);
      console.info('Honda bone tester ready: window.__morphDriveBoneTest');
    }

    if (activeVehicleId === 'bmw-s1000rr') {
      window.__morphDriveBMWRigReport = rigReport;
      window.__morphDriveBMWBoneTest = createBoneMovementTester(vehicle);
      console.info('BMW bone tester ready: window.__morphDriveBMWBoneTest');
    }

    console.groupEnd();

    window.getMorphDriveExplosionStatus = function () {
      return explosionManager?.getStatus() ?? null;
    };

    window.__morphDriveGetParts = () =>
      explosionManager?.getAvailableParts() ?? [];

    explosionManager = createExplosionManager({
      root: vehicle,
      vehicleId: activeVehicleId,
      distanceFactor: 0.16
    });

    console.info(
      'MorphDrive: Explosion manager initialized.',
      explosionManager.getStatus()
    );

    console.info(
      'MorphDrive: Available configured components:',
      explosionManager.getAvailableParts()
    );
  }

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


  // -------------------------------------------------


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

    for (const model of VEHICLE_CATALOG) {
  vehicleManager.registerModel({
    id: model.id,
    name: model.name,
    type: model.type,
    url: model.url
  });
}


async function activateVehicle(id) {
  try {
    const result = await vehicleManager.loadModel(id);

    activeVehicleId = id;
    initializeVehicle(result.root, result.model);
    updateVehicleCatalogOptions(result.model.id);
    setVehicleLoading(false);

    return true;
  } catch (error) {
    if (error?.name === 'AbortError') return false;

    console.error('MorphDrive: Vehicle loading failed:', error);
    loadingPanel.classList.add('hidden');

    modelError.textContent = error?.message
      ? `Could not load vehicle: ${error.message}`
      : 'Could not load this vehicle. Check that the GLB file is valid and try again.';

    modelError.classList.remove('hidden');
    vehicleSelect.value = vehicleManager.getActiveModel()?.id || 'sedan';
    vehicleSelect.disabled = false;
    importVehicleButton.disabled = false;

    return false;
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
        return false;
      } finally {
        // Allow selecting the same file again after a failed import.
        vehicleFileInput.value = '';
      }
    });

    updateVehicleCatalogOptions();

function setShowroomCamera() {
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.45;

  if (!vehicle) {
    controls.target.set(0, 1, 0);
    camera.position.set(7, 4.2, 8);
    controls.update();
    return;
  }

  vehicle.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(vehicle);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());

  const modelSize = Math.max(
    size.x,
    size.y,
    size.z,
    2
  );

  const distance = Math.max(7, modelSize * 1.75);

  controls.target.copy(center);

  camera.position.set(
    center.x + distance * 1.25,
    center.y + distance * 0.58,
    center.z + distance * 1.35
  );

  // Do not stop at the vehicle surface: allow close-up and interior exploration.
  controls.minDistance = 0.05;
  controls.maxDistance = Math.max(18, modelSize * 5);

  controls.update();
}

const cockpitCamera = createCockpitCamera({
  THREE,
  camera,
  controls
});

function setCockpitCamera() {
  if (!vehicle || !activeVehicleId) {
    console.warn('MorphDrive: cannot enter cockpit without an active vehicle.');
    return false;
  }

  return cockpitCamera.enter(vehicle, activeVehicleId);
}

function setFreeExploreCamera() {
  controls.autoRotate = false;
  controls.minDistance = 0.05;

  if (vehicle) {
    vehicle.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(vehicle);
    const size = bounds.getSize(new THREE.Vector3());
    controls.maxDistance = Math.max(18, size.length() * 5);
  } else {
    controls.maxDistance = 18;
  }

  camera.position.set(7, 4.2, 8);
  controls.target.set(0, 1, 0);
  controls.update();

  const button = document.querySelector('#front-seat');
  if (button) {
    button.classList.remove('active');
    button.setAttribute('aria-pressed', 'false');
  }

  return true;
}

const showroom = createShowroom({
  vehicles: VEHICLE_CATALOG,

  onPreview: async id => {
    const loaded = await activateVehicle(id);

    if (!loaded) return false;

    activePreviewId = id;

    if (showroomMode) {
      setShowroomCamera();
    }

    return true;
  },

  onExplore: async id => {
    if (activePreviewId !== id) {
      const loaded = await activateVehicle(id);

      if (!loaded) return false;

      activePreviewId = id;
    }

    showroomMode = false;
    showroomStage.visible = false;

    showroom.hide();

    cockpit.classList.remove('cockpit--hidden');
    backToShowroomButton.hidden = false;

    viewport.prepend(renderer.domElement);

    setFreeExploreCamera();
    resize();

    return true;
  }
});

const showroomPreviewHost = showroom.getPreviewHost();

showroomPreviewHost.append(renderer.domElement);

showroomMode = true;
showroomStage.visible = true;

cockpit.classList.add('cockpit--hidden');
backToShowroomButton.hidden = true;

backToShowroomButton.addEventListener('click', () => {
  showroomMode = true;
  showroomStage.visible = true;

  showroomPreviewHost.append(renderer.domElement);

  cockpit.classList.add('cockpit--hidden');
  backToShowroomButton.hidden = true;

  showroom.show();

  setShowroomCamera();
  resize();
});resize


    document.querySelector('#wireframe').addEventListener('click', () => {
      if (!vehicle || !originalMaterials.length) return;

      restoreHoveredMesh();
      wireframe = !wireframe;

      originalMaterials.forEach(entry => {
        const material = entry.material;
        if (!material) return;
        material.wireframe = wireframe ? true : entry.originalWireframe;
        material.needsUpdate = true;
      });

      const button = document.querySelector('#wireframe');
      button.classList.toggle('active', wireframe);
      button.setAttribute('aria-pressed', String(wireframe));
      button.title = wireframe ? 'Turn wireframe off' : 'Turn wireframe on';
      button.setAttribute('aria-label', button.title);
      hoverDirty = true;
    });

    document.querySelector('#front-seat').addEventListener('click', () => {
      if (!setCockpitCamera()) return;

      const button = document.querySelector('#front-seat');
      button.classList.add('active');
      button.setAttribute('aria-pressed', 'true');
    });

    document.querySelector('#reset').addEventListener('click', () => {
      setFreeExploreCamera();
    });

    scanButton?.addEventListener('click', () => {
      if (!vehicle) return;

      if (vehicleScanner.isActive()) {
        vehicleScanner.stop();
      } else {
        vehicleScanner.start();
      }
    });

    document.querySelector('#explode').addEventListener(
  'click',
  (event) => {
    if (!vehicle) return;

    // --------------------------------------------------
    // NON-SEDAN VEHICLES: USE THE REUSABLE EXPLOSION MANAGER
    // --------------------------------------------------

    if (activeVehicleId !== 'sedan') {
      if (!explosionManager) {
        console.warn(
          'Explode: No explosion manager is available for this vehicle.'
        );
        return;
      }

      const status = explosionManager.getStatus();

      const result = status.exploded
        ? explosionManager.assemble()
        : explosionManager.explode();

      if (!result.success) {
        console.warn('MorphDrive explosion:', result.reason);

        if (result.missingNames) {
          console.warn('Configured names:', result.missingNames);
        }

        return;
      }

      event.currentTarget.classList.toggle(
        'active',
        result.exploded
      );

      hoverDirty = true;

      console.log(
        `MorphDrive: ${result.exploded ? 'EXPLODED' : 'ASSEMBLED'}`,
        result
      );

      return;
    }

    // --------------------------------------------------
    // SEDAN: handled by the dedicated listener below.
    // --------------------------------------------------

      }
    );



  document.querySelector('#explode').addEventListener(
    'click',
    (event) => {
      if (!vehicle) return;

      // The original component-by-component explosion is Sedan-only.
      if (activeVehicleId !== 'sedan') return;

      // Persistent animation state; also cancels an interrupted transition.
      const sedanAnimationState = vehicle.userData.sedanExplosionAnimation ||
        (vehicle.userData.sedanExplosionAnimation = {
          frame: null,
          token: 0
        });

      if (sedanAnimationState.frame !== null) {
        cancelAnimationFrame(sedanAnimationState.frame);
        sedanAnimationState.frame = null;
      }

      sedanAnimationState.token++;

      const frontComponents = new Set([
        'engine-protector_29',
        'engine-transmission_30',
        'frame-front_34',
        'suspension-front_79',
        'engine-parts_28',
        'bumper-front_8',
        'honeycomb-grill-pattern_58',
        'bumper-front-grill-frame_9',
        'hood_60'
      ]);

      const explosionDistance = 1.8;


    // Individual explosion directions for the rear assembly.
    const rearDirections = {
      // Rear lights: spread left and right, outward and backward.
      'taillight-lens-trunk-l_90': [0.75, 0.35, -0.56],
      'taillight-lens-trunk-r_91': [-0.75, 0.35, -0.56],
      'taillight-led-l_87': [0.8, 0.4, -0.45],
      'taillight-led-r_88': [-0.8, 0.4, -0.45],
      'taillight-trim-l_95': [0.85, 0.3, -0.45],
      'taillight-trim-r_96': [-0.85, 0.3, -0.45],
      'taillight-led-02-l_85': [0.8, 0.45, -0.4],
      'taillight-led-02-r_86': [-0.8, 0.45, -0.4],
      'taillight-back-trunk-02-l_83': [0.75, 0.5, -0.55],
      'taillight-back-trunk-02-r_84': [-0.75, 0.5, -0.55],
      'taillight-lens-r_89': [-0.85, 0.4, -0.35],
      'taillight-lens-l_92': [0.85, 0.4, -0.35],
      'taillight-back-01-l_81': [0.85, 0.45, -0.4],
      'taillight-back-01-r_82': [-0.85, 0.45, -0.4],
      'taillight-trim-01-l_93': [0.9, 0.35, -0.35],
      'taillight-trim-01-r_94': [-0.9, 0.35, -0.35],
      'taillight-trim-top-l_97': [0.8, 0.65, -0.3],
      'taillight-trim-top-r_98': [-0.8, 0.65, -0.3],

      // Main rear body components.
      // Main rear body components.
'trunk_99': [0, 1, -0.35],
'bumper-rear_10': [0, 0.45, -0.9],
'frame-rear_36': [0, 0.8, -0.6],
'frame-middle_35': [0, 1, 0.15],
'glass-rear_42': [0, 1, -0.3],

// Rear cabin and structural components.
'backseat_63': [0, 1, -0.2],
'sedan-unibody_65': [0, 1.2, 0],
'roof-pillar-interior_64': [0, 1, 0.2],

// Rear exhaust system.
'escape-pipes_03': [0, -0.8, -0.6],
      // Rear brakes and suspension.
      'brake-caliper-rear-l_2': [1, 0.35, -0.25],
      'brake-caliper-rear-r_3': [-1, 0.35, -0.25],
      'shock-absorber002_68': [0.85, 0.75, -0.3],
      'shock-absorber003_69': [-0.85, 0.75, -0.3],
      'spring002_76': [0.9, 0.65, -0.25],
      'spring003_77': [-0.9, 0.65, -0.25],
      'brake-disc-rear-l_6': [1, 0.4, -0.2],
      'brake-disc-rear-r_7': [-1, 0.4, -0.2],
      'suspension-rear_80': [0, 0.65, -0.76]
    };


      // Find the common component container.
      const componentContainer = vehicle.getObjectByName('carBody_119');

      if (!componentContainer) {
        console.error('Explode: carBody_119 not found.');
        return;
      }

      // Collect all complete component groups.
      const parts = componentContainer.children.filter(part => {
        let containsMesh = false;

        part.traverse(child => {
          if (child.isMesh) containsMesh = true;
        });

        return containsMesh;
      });

      if (!parts.length) {
        console.error('Explode: No component groups found.');
        return;
      }

      vehicle.updateMatrixWorld(true);

      const vehicleBounds = new THREE.Box3().setFromObject(vehicle);
      const vehicleCenter = vehicleBounds.getCenter(
        new THREE.Vector3()
      );

      const sedanStartPositions = new Map(
        parts.map(part => [part, part.position.clone()])
      );

      exploded = !exploded;

      let frontMoved = 0;
let rearMoved = 0;
let otherMoved = 0;

      for (const part of parts) {

        // Save the original position once.
        if (!part.userData.explosionOriginalPosition) {
          part.userData.explosionOriginalPosition =
            part.position.clone();
        }

        // Restore all components when assembling.
        if (!exploded) {
          part.position.copy(
            part.userData.explosionOriginalPosition
          );
          continue;
        }

        const partBounds = new THREE.Box3().setFromObject(part);
        const partCenter = partBounds.getCenter(
          new THREE.Vector3()
        );

      
      let direction;

      if (frontComponents.has(part.name)) {

        // Preserve the working front explosion directions.
        const frontDirections = {
          'engine-protector_29': [0, 0.55, 0.76],
          'engine-transmission_30': [-0.65, 0.55, 0.68],
          'frame-front_34': [0, 0.65, -0.76],
          'suspension-front_79': [1, 0, 0],
          'engine-parts_28': [0, 0.85, 0.53],
          'bumper-front_8': [0, 0, 1],
          'honeycomb-grill-pattern_58': [0, 0.75, 0.66],
          'bumper-front-grill-frame_9': [0, 0.45, 0.89],
          'hood_60': [0, 1, 0]
        };

        direction = new THREE.Vector3(
          ...frontDirections[part.name]
        );

        frontMoved++;

      } else if (rearDirections[part.name]) {

        // Separate rear components individually.
        direction = new THREE.Vector3(
          ...rearDirections[part.name]
        );

        rearMoved++;

      } else {

        // Preserve the original behavior for all other components.
        direction = partCenter.clone().sub(vehicleCenter);

        direction.y = Math.max(direction.y, 0.2);

        if (direction.lengthSq() < 0.000001) {
          direction.set(0, 1, 0);
        }

        otherMoved++;
      }

      direction.normalize();



        const originalWorldPosition = part.getWorldPosition(
          new THREE.Vector3()
        );

        const targetWorldPosition = originalWorldPosition
          .clone()
          .addScaledVector(direction, explosionDistance);

        const targetLocalPosition = part.parent.worldToLocal(
          targetWorldPosition
        );

        part.position.copy(targetLocalPosition);
      }


      const sedanTargetPositions = parts.map(part => ({
        part,
        start: sedanStartPositions.get(part),
        end: part.position.clone()
      })).filter(item => item.start && item.start.distanceToSquared(item.end) > 1e-8);

      // Return to the captured positions, then animate toward the existing targets.
      for (const item of sedanTargetPositions) {
        item.part.position.copy(item.start);
      }

      const animationToken = ++sedanAnimationState.token;
      const animationStartTime = performance.now();
      const SEDAN_EXPLOSION_ANIMATION_DURATION = 850;

      function animateSedanExplosion(now) {
        if (animationToken !== sedanAnimationState.token) return;

        const progress = Math.min(
          (now - animationStartTime) / SEDAN_EXPLOSION_ANIMATION_DURATION,
          1
        );

        // Smoothstep easing.
        const eased = progress * progress * (3 - 2 * progress);

        for (const item of sedanTargetPositions) {
          item.part.position.lerpVectors(item.start, item.end, eased);
        }

        vehicle.updateMatrixWorld(true);

        if (progress < 1) {
          sedanAnimationState.frame = requestAnimationFrame(animateSedanExplosion);
        } else {
          for (const item of sedanTargetPositions) {
            item.part.position.copy(item.end);
          }

          vehicle.updateMatrixWorld(true);
          sedanAnimationState.frame = null;
        }
      }

      if (sedanTargetPositions.length) {
        sedanAnimationState.frame = requestAnimationFrame(animateSedanExplosion);
      }

      vehicle.updateMatrixWorld(true);

      event.currentTarget.classList.toggle('active', exploded);

      hoverDirty = true;

      console.log(
        `Explode: ${exploded ? 'EXPLODED' : 'ASSEMBLED'}`,
        {
  frontComponentsMoved: frontMoved,
  rearComponentsMoved: rearMoved,
  otherComponentsMoved: otherMoved,
  totalComponents: parts.length,
  explosionDistance
}
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

    const workspace = document.querySelector('.workspace');
    const browserPanel = document.querySelector('.browser');
    const propertiesPanel = document.querySelector('.properties');
    const browserToggle = document.querySelector('#toggle-browser');
    const propertiesToggle = document.querySelector('#toggle-properties');

    // MORPHDRIVE: Engineering Inspection Mode
    let selectedInspectionMesh = null;
    let selectedOriginalMaterial = null;
    let selectedHighlightMaterial = null;

    function disposeInspectionMaterial(material) {
      if (Array.isArray(material)) {
        material.forEach(item => item?.dispose());
      } else {
        material?.dispose();
      }
    }

    function createInspectionMaterial(original) {
      const highlight = material => {
        if (!material) return material;

        const clone = material.clone();

        if (clone.emissive) {
          clone.emissive.set(0x00cfff);
          clone.emissiveIntensity = 0.9;
        } else if (clone.color) {
          clone.color.lerp(new THREE.Color(0x00cfff), 0.55);
        }

        return clone;
      };

      return Array.isArray(original)
        ? original.map(highlight)
        : highlight(original);
    }

    const inspectionDetails = document.createElement('div');
    inspectionDetails.id = 'inspection-details';
    inspectionDetails.style.cssText = `
      padding: 16px;
      color: #dceaf5;
      font-size: 12px;
      line-height: 1.7;
      overflow-y: auto;
    `;

    propertiesPanel.appendChild(inspectionDetails);

    function inspectionRow(label, value) {
      const row = document.createElement('div');
      row.style.cssText = `
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 7px 0;
        border-bottom: 1px solid rgba(0,207,255,0.12);
      `;

      const name = document.createElement('span');
      name.textContent = label;
      name.style.color = '#8299aa';

      const content = document.createElement('span');
      content.textContent = String(value);
      content.style.cssText = `
        color: #e5f7ff;
        text-align: right;
        overflow-wrap: anywhere;
        max-width: 65%;
      `;

      row.append(name, content);
      return row;
    }

    function selectInspectionMesh(mesh) {
      // Restore the previous selection without breaking the hover effect.
      if (selectedInspectionMesh) {
        if (hoveredMesh === selectedInspectionMesh) {
          hoveredOriginalMaterial = selectedOriginalMaterial;
        } else {
          selectedInspectionMesh.material = selectedOriginalMaterial;
        }

        disposeInspectionMaterial(selectedHighlightMaterial);
      }

      selectedInspectionMesh = mesh;
      selectedOriginalMaterial = null;
      selectedHighlightMaterial = null;

      if (!mesh) {
        inspectionDetails.replaceChildren();
        const message = document.createElement('p');
        message.textContent = 'Click a vehicle component to inspect it.';
        message.style.color = '#8299aa';
        inspectionDetails.appendChild(message);
        return;
      }

      selectedOriginalMaterial =
        hoveredMesh === mesh ? hoveredOriginalMaterial : mesh.material;

      selectedHighlightMaterial =
        createInspectionMaterial(selectedOriginalMaterial);

      mesh.material = selectedHighlightMaterial;

      const box = new THREE.Box3().setFromObject(mesh);
      const dimensions = new THREE.Vector3();
      const position = new THREE.Vector3();

      box.getSize(dimensions);
      mesh.getWorldPosition(position);

      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];

      const materialNames = materials
        .filter(Boolean)
        .map(material => material.name || material.type || 'Unnamed material')
        .join(', ') || 'Not available';

      let meshCount = 0;
      mesh.traverse(object => {
        if (object.isMesh) meshCount++;
      });

      const hierarchy = [];
      let current = mesh;

      while (current) {
        hierarchy.unshift(current.name || current.type || 'Unnamed object');
        current = current.parent;
        if (current === vehicle) {
          hierarchy.unshift(current.name || 'Vehicle');
          break;
        }
      }

      inspectionDetails.replaceChildren();

      const heading = document.createElement('h3');
      heading.textContent = mesh.name || 'Unnamed component';
      heading.style.cssText = `
        color: #00cfff;
        font-size: 15px;
        margin: 0 0 12px;
        overflow-wrap: anywhere;
      `;
      inspectionDetails.appendChild(heading);

      const addSection = title => {
        const section = document.createElement('h4');
        section.textContent = title;
        section.style.cssText = `
          color: #00cfff;
          margin: 18px 0 6px;
          font-size: 11px;
          letter-spacing: 1px;
          text-transform: uppercase;
        `;
        inspectionDetails.appendChild(section);
      };

      addSection('Component Information');
      inspectionDetails.append(
        inspectionRow('Object type', mesh.type),
        inspectionRow('Mesh type', mesh.isSkinnedMesh ? 'Skinned Mesh' : 'Mesh'),
        inspectionRow('UUID', mesh.uuid),
        inspectionRow('Mesh count', meshCount),
        inspectionRow('Material', materialNames)
      );

      addSection('Dimensions (world units)');
      inspectionDetails.append(
        inspectionRow('Width (X)', dimensions.x.toFixed(3)),
        inspectionRow('Height (Y)', dimensions.y.toFixed(3)),
        inspectionRow('Depth (Z)', dimensions.z.toFixed(3))
      );

      addSection('World Position');
      inspectionDetails.append(
        inspectionRow('X', position.x.toFixed(3)),
        inspectionRow('Y', position.y.toFixed(3)),
        inspectionRow('Z', position.z.toFixed(3))
      );

      addSection('Hierarchy');
      const hierarchyText = document.createElement('p');
      hierarchyText.textContent = hierarchy.join('  ›  ');
      hierarchyText.style.cssText = `
        color: #b8d0df;
        overflow-wrap: anywhere;
        margin: 4px 0;
      `;
      inspectionDetails.appendChild(hierarchyText);

      addSection('Direct Children');
      const childrenText = document.createElement('p');
      childrenText.textContent = mesh.children.length
        ? mesh.children.map(child => child.name || child.type).join(', ')
        : 'No child objects';
      childrenText.style.cssText = `
        color: #b8d0df;
        overflow-wrap: anywhere;
        margin: 4px 0;
      `;
      inspectionDetails.appendChild(childrenText);

      // Open the existing Properties panel.
      propertiesPanel.classList.remove('collapsed');
      workspace.classList.remove('properties-collapsed');
      propertiesToggle?.setAttribute('aria-expanded', 'true');

      requestAnimationFrame(() => {
        renderer.setSize(viewport.clientWidth, viewport.clientHeight);
        camera.aspect = viewport.clientWidth / viewport.clientHeight;
        camera.updateProjectionMatrix();
      });
    }

    renderer.domElement.addEventListener('click', event => {
      if (!vehicle || showroomMode) return;

      const rect = renderer.domElement.getBoundingClientRect();

      pointerNdc.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );

      camera.updateMatrixWorld(true);
      raycaster.setFromCamera(pointerNdc, camera);

      const hits = raycaster.intersectObject(vehicle, true);
      const hit = hits.find(item => item.object.isMesh);

      selectInspectionMesh(hit?.object || null);
    });

    function setPanelCollapsed(panel, workspaceClass, toggleButton) {
      const isCollapsed = panel.classList.toggle('collapsed');
      workspace.classList.toggle(workspaceClass, isCollapsed);
      if (toggleButton) {
        toggleButton.setAttribute('aria-expanded', String(!isCollapsed));
      }
      requestAnimationFrame(() => {
        renderer.setSize(viewport.clientWidth, viewport.clientHeight);
        camera.aspect = viewport.clientWidth / viewport.clientHeight;
        camera.updateProjectionMatrix();
      });
    }

    browserToggle.addEventListener('click', () => {
      setPanelCollapsed(browserPanel, 'browser-collapsed', browserToggle);
    });

    propertiesToggle.addEventListener('click', () => {
      setPanelCollapsed(propertiesPanel, 'properties-collapsed', propertiesToggle);
    });

    document.querySelector('#close-properties').addEventListener('click', () => {
      setPanelCollapsed(propertiesPanel, 'properties-collapsed', propertiesToggle);
    });

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

    // MORPHDRIVE: Premium preset paint palette.
    const paintPalette = [
      { name: 'Electric Blue', color: '#087DE0' },
      { name: 'Midnight Blue', color: '#101D45' },
      { name: 'Cyber Cyan', color: '#00D9FF' },
      { name: 'Racing Red', color: '#E51B32' },
      { name: 'Crimson', color: '#85152B' },
      { name: 'Sunset Orange', color: '#FF6B20' },
      { name: 'Golden Yellow', color: '#F5C542' },
      { name: 'Emerald', color: '#087A55' },
      { name: 'Lime Green', color: '#9BCB35' },
      { name: 'Pearl White', color: '#E8EDF2' },
      { name: 'Graphite', color: '#454B55' },
      { name: 'Obsidian Black', color: '#111318' }
    ];

    const paletteHost =
      colorPicker.closest('.color-control') || colorPicker.parentElement;

    if (paletteHost && !document.querySelector('#morphdrive-paint-palette')) {
      const paletteSection = document.createElement('section');
      paletteSection.id = 'morphdrive-paint-palette';
      paletteSection.className = 'md-palette-section';

      const paletteHeading = document.createElement('div');
      paletteHeading.className = 'md-palette-heading';

      const paletteTitle = document.createElement('span');
      paletteTitle.textContent = 'SIGNATURE COLORS';

      const paletteCount = document.createElement('span');
      paletteCount.textContent = '12 COLORS';

      paletteHeading.append(paletteTitle, paletteCount);

      const swatches = document.createElement('div');
      swatches.className = 'md-paint-swatches';

      paintPalette.forEach(preset => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'md-paint-swatch';
        button.style.setProperty('--swatch-color', preset.color);
        button.title = preset.name;
        button.setAttribute('aria-label', `Apply ${preset.name}`);
        button.setAttribute('aria-pressed', 'false');

        button.addEventListener('click', () => {
          colorPicker.value = preset.color;
          colorPicker.dispatchEvent(new Event('input', { bubbles: true }));

          swatches.querySelectorAll('.md-paint-swatch').forEach(item => {
            item.setAttribute('aria-pressed', String(item === button));
          });
        });

        swatches.appendChild(button);
      });

      paletteSection.append(paletteHeading, swatches);
      paletteHost.insertAdjacentElement('afterend', paletteSection);
    }

    // Keep preset selection synchronized with the native color picker.
    colorPicker.addEventListener('input', () => {
      const selected = paintPalette.find(
        preset => preset.color.toLowerCase() === colorPicker.value.toLowerCase()
      );

      document.querySelectorAll('.md-paint-swatch').forEach(button => {
        const matches = selected && button.title === selected.name;
        button.setAttribute('aria-pressed', String(Boolean(matches)));
      });
    });


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
        document.querySelector('#wireframe')
          .setAttribute('aria-pressed', 'false');
        document.querySelector('#wireframe')
          .title = 'Turn wireframe on';

      });

 function resize() {
  const renderHost = renderer.domElement.parentElement || viewport;

  const width = renderHost.clientWidth;
  const height = renderHost.clientHeight;

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
observer.observe(showroomPreviewHost);

function animate(now = 0) {
  requestAnimationFrame(animate);

  const cameraChanged = controls.update();
  vehicleScanner.update(now);

  // Process only newly detected hand frames, not every render frame.
  const gestureFrame = handController.getGestureFrame();
  const gestureResult = gestureRecognizer.update(gestureFrame);

  if (gestureResult) {
    const hands = Object.entries(gestureResult.hands);
    const left = gestureResult.hands.Left;
    const right = gestureResult.hands.Right;

    const twoOpenPalms =
      left?.stableGesture === 'OPEN_PALM' &&
      right?.stableGesture === 'OPEN_PALM';

    if (gestureStatus) {
      if (twoOpenPalms && gestureResult.zoom) {
        gestureStatus.textContent =
          `TWO HANDS: ZOOM ${gestureResult.zoom.direction}`;
      } else if (hands.length === 0) {
        gestureStatus.textContent = 'GESTURE: SHOW HANDS';
      } else {
        gestureStatus.textContent = hands.map(([side, data]) => {
          const name = data.stableGesture !== 'NONE'
            ? data.stableGesture
            : data.gesture;

          const progress = Math.min(
            100,
            Math.round(data.heldFor / 300 * 100)
          );

          return `${side.toUpperCase()}: ${name} ${progress}%`;
        }).join('  |  ');
      }
    }

    if (vehicle && !showroomMode) {
      const explodeButton = document.querySelector('#explode');

      // ------------------------------------------------------
      // ONE-SHOT GESTURE ACTIONS
      // ------------------------------------------------------

      for (const [side, data] of hands) {
        const gesture = data.stableGesture;
        const previous =
          gestureActionState.previousStable.get(side) || 'NONE';

        if (gesture !== previous && gesture !== 'NONE') {
          if (
            gesture === 'FIST' &&
            gestureActionReady('explode', now, 1500)
          ) {
            explodeButton?.click();
          }

          if (
            gesture === 'PEACE' &&
            gestureActionReady('scan', now, 1200)
          ) {
            if (!vehicleScanner.isActive()) {
              vehicleScanner.start();
            }
          }

          if (
            gesture === 'THUMBS_UP' &&
            gestureActionReady('reset', now, 1800)
          ) {
            document.querySelector('#reset')?.click();
          }

          if (
            gesture === 'OPEN_PALM' &&
            explodeButton?.classList.contains('active') &&
            gestureActionReady('assemble', now, 1500)
          ) {
            explodeButton.click();
          }

          // Select the component currently under the pointing fingertip.
          if (
            gesture === 'POINT' &&
            gestureActionReady('select', now, 650)
          ) {
            const pointers = handController.getTrackedPointers();
            const pointer = pointers[0];

            if (pointer && raycaster && vehicle) {
              camera.updateMatrixWorld(true);
              raycaster.setFromCamera(pointer, camera);

              const hits = raycaster.intersectObject(vehicle, true);
              const hit = hits.find(item => item.object.isMesh);

              if (hit) {
                selectInspectionMesh(hit.object);
                hoverDirty = true;
              }
            }
          }
        }

        gestureActionState.previousStable.set(side, gesture);
      }

      // Clear the previous gesture state when a hand disappears.
      for (const side of ['Left', 'Right']) {
        if (!gestureResult.hands[side]) {
          gestureActionState.previousStable.set(side, 'NONE');
        }
      }

      // ------------------------------------------------------
      // TWO-HAND ZOOM
      // Both hands must hold open palms to activate zoom.
      // ------------------------------------------------------

      if (
        twoOpenPalms &&
        gestureResult.zoom &&
        gestureResult.zoom.change > 0
      ) {
        const change = Math.min(gestureResult.zoom.change * 1.8, 0.08);

        const factor = gestureResult.zoom.direction === 'IN'
          ? 1 - change
          : 1 + change;

        const offset = camera.position.clone().sub(controls.target);
        const nextDistance = Math.max(
          controls.minDistance,
          Math.min(controls.maxDistance, offset.length() * factor)
        );

        offset.setLength(nextDistance);
        camera.position.copy(controls.target).add(offset);
        controls.update();
      }

      // ------------------------------------------------------
      // ONE-HAND OPEN-PALM CAMERA ROTATION
      // Two open palms are reserved for zoom.
      // ------------------------------------------------------

      const rotatingSide = !twoOpenPalms
        ? hands.find(([, data]) => data.stableGesture === 'OPEN_PALM')?.[0]
        : null;

      if (rotatingSide) {
        const points = gestureFrame.hands.get(rotatingSide);

        if (points?.length === 21) {
          let centerX = 0;
          let centerY = 0;

          for (const id of [0, 5, 9, 13, 17]) {
            centerX += 1 - points[id].x;
            centerY += points[id].y;
          }

          centerX /= 5;
          centerY /= 5;

          const previous = gestureActionState.previousPalmCenter;

          if (previous) {
            const deltaX = centerX - previous.x;
            const deltaY = centerY - previous.y;

            if (Math.abs(deltaX) + Math.abs(deltaY) > 0.0015) {
              const offset = camera.position.clone().sub(controls.target);
              const spherical = new THREE.Spherical().setFromVector3(offset);

              spherical.theta -= deltaX * 2.8;
              spherical.phi = THREE.MathUtils.clamp(
                spherical.phi + deltaY * 2.0,
                controls.minPolarAngle,
                controls.maxPolarAngle
              );

              camera.position.copy(controls.target).add(
                offset.setFromSpherical(spherical)
              );

              controls.update();
            }
          }

          gestureActionState.previousPalmCenter = {
            x: centerX,
            y: centerY
          };
        }
      } else {
        gestureActionState.previousPalmCenter = null;
      }
    }
  }

  if (!showroomMode) {
    updateVehicleHover(now, cameraChanged);
  }

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
