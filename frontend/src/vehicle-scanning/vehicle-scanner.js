import * as THREE from 'three';

export function createVehicleScanner({ scene, onStateChange = () => {} }) {
  const overlayGroup = new THREE.Group();
  overlayGroup.name = 'MorphDriveVehicleScanOverlay';
  scene.add(overlayGroup);

  const beamMaterial = new THREE.MeshBasicMaterial({
    color: 0x00d9ff,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    beamMaterial
  );

  beam.name = 'MorphDriveScanningBeam';
  beam.visible = false;
  beam.renderOrder = 20;
  scene.add(beam);

  const clock = new THREE.Clock();

  let currentVehicle = null;
  let scanRecords = [];
  let scanBounds = null;
  let scanAxis = 'z';
  let scanStart = 0;
  let active = false;
  let disposed = false;

  const duration = 3000;
  const fadeDuration = 850;

  function clearOverlay() {
    for (const record of scanRecords) {
      overlayGroup.remove(record.overlay);
      record.material.dispose();
    }

    scanRecords = [];
    overlayGroup.clear();

    beam.visible = false;
    active = false;
  }

  function setVehicle(root) {
    clearOverlay();
    currentVehicle = root;

    if (root) {
      root.updateMatrixWorld(true);
    }

    onStateChange('idle');
  }

  function prepareScan() {
    if (!currentVehicle) return false;

    currentVehicle.updateMatrixWorld(true);

    scanBounds = new THREE.Box3().setFromObject(currentVehicle);

    if (scanBounds.isEmpty()) return false;

    const size = scanBounds.getSize(new THREE.Vector3());

    scanAxis = size.x >= size.z ? 'x' : 'z';

    currentVehicle.traverse(object => {
      if (!object.isMesh || !object.visible || object.isSkinnedMesh) {
        return;
      }

      const bounds = new THREE.Box3().setFromObject(object);

      if (bounds.isEmpty()) return;

      const center = bounds.getCenter(new THREE.Vector3());

      const material = new THREE.MeshBasicMaterial({
        color: 0x27dfff,
        wireframe: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide
      });

      const overlay = new THREE.Mesh(object.geometry, material);

      object.updateWorldMatrix(true, false);

      object.matrixWorld.decompose(
        overlay.position,
        overlay.quaternion,
        overlay.scale
      );

      overlay.renderOrder = 15;
      overlay.frustumCulled = false;

      overlayGroup.add(overlay);

      scanRecords.push({
        overlay,
        material,
        coordinate: center[scanAxis]
      });
    });

    return scanRecords.length > 0;
  }

  function start() {
    if (disposed || !currentVehicle) return false;

    if (active) {
      stop();
    }

    clearOverlay();

    if (!prepareScan()) {
      console.warn('MorphDrive Scanner: No suitable vehicle meshes found.');
      return false;
    }

    const size = scanBounds.getSize(new THREE.Vector3());
    const center = scanBounds.getCenter(new THREE.Vector3());

    const thickness = Math.max(
      0.025,
      Math.max(size.x, size.y, size.z) * 0.006
    );

    beam.geometry.dispose();

    beam.geometry = scanAxis === 'x'
      ? new THREE.BoxGeometry(thickness, size.y * 1.12, size.z * 1.12)
      : new THREE.BoxGeometry(size.x * 1.12, size.y * 1.12, thickness);

    beam.position.copy(center);
    beam.position[scanAxis] = scanBounds.min[scanAxis];
    beam.visible = true;

    scanStart = clock.elapsedTime;
    active = true;

    onStateChange('scanning');

    return true;
  }

  function stop() {
    clearOverlay();
    onStateChange('idle');
  }

  function update() {
    if (!active || !scanBounds) return;

    const elapsed = clock.elapsedTime - scanStart;
    const progress = Math.min(elapsed / (duration / 1000), 1);

    const min = scanBounds.min[scanAxis];
    const max = scanBounds.max[scanAxis];
    const length = Math.max(max - min, 0.001);

    const scanPosition = THREE.MathUtils.lerp(min, max, progress);

    beam.position[scanAxis] = scanPosition;

    // Subtle pulsing makes the scanning beam feel more energetic.
    beam.material.opacity =
      0.15 + Math.sin(elapsed * 12) * 0.045;

    for (const record of scanRecords) {
      const normalizedPosition =
        (record.coordinate - min) / length;

      const reveal = THREE.MathUtils.clamp(
        (progress - normalizedPosition + 0.18) / 0.18,
        0,
        1
      );

      record.material.opacity = reveal * 0.78;
    }

    if (progress >= 1) {
      const fade = Math.min(
        (elapsed - duration / 1000) / (fadeDuration / 1000),
        1
      );

      for (const record of scanRecords) {
        record.material.opacity *= 1 - fade;
      }

      beam.material.opacity = 0.2 * (1 - fade);

      if (fade >= 1) {
        clearOverlay();
        onStateChange('idle');
      }
    }
  }

  function dispose() {
    if (disposed) return;

    clearOverlay();
    scene.remove(beam);
    scene.remove(overlayGroup);

    beam.geometry.dispose();
    beam.material.dispose();

    currentVehicle = null;
    disposed = true;
  }

  return {
    setVehicle,
    start,
    stop,
    update,
    dispose,
    isActive: () => active
  };
}
