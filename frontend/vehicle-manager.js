import { Box3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Loads, normalizes, swaps, and disposes vehicle models for MorphDrive 3D.
 * Built-in models are registered by URL; local imports are restricted to GLB
 * because a standalone .gltf file may depend on external .bin/texture files.
 */
export function createVehicleManager({
  scene,
  onBeforeReplace = () => {},
  onProgress = () => {},
  targetSize = 5
}) {
  if (!scene) {
    throw new Error('VehicleManager requires a Three.js scene.');
  }

  const loader = new GLTFLoader();
  const catalog = new Map();
  const importedUrls = new Set();

  let activeRoot = null;
  let activeModel = null;
  let loadSequence = 0;
  let disposed = false;

  function disposeModelResources(root) {
    if (!root) return;

    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    const skeletons = new Set();

    root.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.isSkinnedMesh && object.skeleton) {
        skeletons.add(object.skeleton);
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
          if (value?.isTexture) textures.add(value);
        }
      }
    });

    for (const texture of textures) texture.dispose();
    for (const material of materials) material.dispose();
    for (const geometry of geometries) geometry.dispose();
    for (const skeleton of skeletons) skeleton.dispose();
  }

  function normalizeModel(root) {
    root.updateMatrixWorld(true);

    const bounds = new Box3().setFromObject(root);
    const size = bounds.getSize();
    const center = bounds.getCenter();
    const largestDimension = Math.max(size.x, size.y, size.z);

    if (!Number.isFinite(largestDimension) || largestDimension <= 0) {
      throw new Error('The selected vehicle has invalid or empty 3D geometry.');
    }

    const scale = targetSize / largestDimension;
    root.scale.multiplyScalar(scale);
    root.position.set(
      -center.x * scale,
      -bounds.min.y * scale,
      -center.z * scale
    );
    root.updateMatrixWorld(true);
  }

  function registerModel(model) {
    if (!model?.id || !model?.name || !model?.url) {
      throw new Error('A vehicle model requires an id, name, and URL.');
    }

    catalog.set(model.id, {
      id: model.id,
      name: model.name,
      type: model.type || 'Vehicle',
      url: model.url,
      source: model.source || 'library'
    });
  }

  function getCatalog() {
    return [...catalog.values()].map(model => ({ ...model }));
  }

  function getActiveModel() {
    return activeModel ? { ...activeModel } : null;
  }

  async function loadSource(model, url, revokeUrlAfterLoad = false) {
    if (disposed) throw new Error('VehicleManager has been disposed.');

    const requestId = ++loadSequence;
    onProgress({ phase: 'start', loaded: 0, total: 0 }, model);

    let gltf;
    try {
      gltf = await loader.loadAsync(url, event => {
        if (requestId !== loadSequence) return;
        onProgress(event, model);
      });
    } catch (error) {
      if (revokeUrlAfterLoad) URL.revokeObjectURL(url);
      throw error;
    }

    const root = gltf.scene;

    if (requestId !== loadSequence || disposed) {
      disposeModelResources(root);
      if (revokeUrlAfterLoad) URL.revokeObjectURL(url);
      const error = new Error('Vehicle loading was superseded.');
      error.name = 'AbortError';
      throw error;
    }

    try {
      normalizeModel(root);
    } catch (error) {
      disposeModelResources(root);
      if (revokeUrlAfterLoad) URL.revokeObjectURL(url);
      throw error;
    }

    const previousRoot = activeRoot;
    onBeforeReplace(previousRoot, root);

    scene.add(root);
    activeRoot = root;
    activeModel = { ...model };

    if (previousRoot) {
      previousRoot.removeFromParent();
      disposeModelResources(previousRoot);
    }

    if (revokeUrlAfterLoad) URL.revokeObjectURL(url);

    onProgress({ phase: 'complete', loaded: 1, total: 1 }, model);
    return { root, model: { ...model }, animations: gltf.animations || [] };
  }

  async function loadModel(id) {
    const model = catalog.get(id);
    if (!model) throw new Error(`Vehicle model "${id}" is not registered.`);
    return loadSource(model, model.url, false);
  }

  async function importFile(file) {
    if (!file) throw new Error('No vehicle file was selected.');

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'glb') {
      throw new Error('Please import a .glb file. Standalone .gltf files may need external assets.');
    }

    if (file.size === 0) {
      throw new Error('The selected GLB file is empty.');
    }

    const safeName = file.name.replace(/\.glb$/i, '').replace(/[_-]+/g, ' ').trim() || 'Imported vehicle';
    const id = `imported-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const url = URL.createObjectURL(file);
    importedUrls.add(url);
    const model = {
      id,
      name: safeName,
      type: 'Imported vehicle',
      url,
      source: 'import'
    };

    try {
      const result = await loadSource(model, url, false);
      catalog.set(id, model);
      return result;
    } catch (error) {
      URL.revokeObjectURL(url);
      importedUrls.delete(url);
      throw error;
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    loadSequence++;

    if (activeRoot) {
      activeRoot.removeFromParent();
      disposeModelResources(activeRoot);
      activeRoot = null;
    }

    for (const url of importedUrls) URL.revokeObjectURL(url);
    importedUrls.clear();
    activeModel = null;
  }

  return {
    registerModel,
    getCatalog,
    getActiveModel,
    loadModel,
    importFile,
    dispose
  };
}
