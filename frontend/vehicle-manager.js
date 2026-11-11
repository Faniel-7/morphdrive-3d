
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Loads, normalizes, swaps, imports, and disposes vehicle models.
 *
 * Built-in models are registered by URL.
 * User imports are restricted to GLB files so external dependencies
 * from standalone glTF files do not cause missing-asset problems.
 */
export function createVehicleManager({
  scene,
  onBeforeReplace = () => {},
  onProgress = () => {},
  targetSize = 5
}) {
  if (!scene?.isScene && !scene?.isObject3D) {
    throw new Error('VehicleManager requires a valid Three.js scene or group.');
  }

  if (!Number.isFinite(targetSize) || targetSize <= 0) {
    throw new Error('VehicleManager targetSize must be a positive number.');
  }

  const loader = new GLTFLoader();
  const catalog = new Map();
  const importedUrls = new Set();

  let activeRoot = null;
  let activeModel = null;
  let loadSequence = 0;
  let disposed = false;

  function notifyProgress(event, model) {
    try {
      onProgress(event, model);
    } catch (error) {
      console.warn('VehicleManager progress callback failed:', error);
    }
  }

  function notifyBeforeReplace(previousRoot, nextRoot) {
    try {
      onBeforeReplace(previousRoot, nextRoot);
    } catch (error) {
      console.warn('VehicleManager replacement callback failed:', error);
    }
  }

  function collectResources(root) {
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    const skeletons = new Set();

    root.traverse(object => {
      if (object.geometry) {
        geometries.add(object.geometry);
      }

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
          if (value?.isTexture) {
            textures.add(value);
          } else if (Array.isArray(value)) {
            for (const item of value) {
              if (item?.isTexture) textures.add(item);
            }
          }
        }

        if (material.uniforms) {
          for (const uniform of Object.values(material.uniforms)) {
            const value = uniform?.value;

            if (value?.isTexture) {
              textures.add(value);
            } else if (Array.isArray(value)) {
              for (const item of value) {
                if (item?.isTexture) textures.add(item);
              }
            }
          }
        }
      }
    });

    return { geometries, materials, textures, skeletons };
  }

  function disposeModelResources(root) {
    if (!root) return;

    const resources = collectResources(root);

    for (const texture of resources.textures) {
      texture.dispose();
    }

    for (const material of resources.materials) {
      material.dispose();
    }

    for (const geometry of resources.geometries) {
      geometry.dispose();
    }

    for (const skeleton of resources.skeletons) {
      skeleton.dispose();
    }
  }

  /**
   * Uses a wrapper group so the original GLTF scene transforms
   * are preserved instead of being overwritten.
   */
  function normalizeModel(gltfScene, modelName) {
    const wrapper = new THREE.Group();
    wrapper.name = `${modelName || 'Vehicle'}_Normalized`;
    wrapper.add(gltfScene);

    wrapper.updateMatrixWorld(true);

    const bounds = new THREE.Box3().setFromObject(wrapper);

    if (bounds.isEmpty()) {
      throw new Error('The selected vehicle contains no visible 3D geometry.');
    }

    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());

    const largestDimension = Math.max(size.x, size.y, size.z);

    if (!Number.isFinite(largestDimension) || largestDimension <= 0) {
      throw new Error('The selected vehicle has invalid or empty 3D geometry.');
    }

    const scale = targetSize / largestDimension;

    wrapper.scale.setScalar(scale);

    wrapper.position.set(
      -center.x * scale,
      -bounds.min.y * scale,
      -center.z * scale
    );

    wrapper.updateMatrixWorld(true);

    return wrapper;
  }

  function registerModel(model) {
    if (!model?.id || !model?.name || !model?.url) {
      throw new Error('A vehicle model requires an id, name, and URL.');
    }

    if (disposed) {
      throw new Error('VehicleManager has been disposed.');
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

  async function loadSource(model, url) {
    if (disposed) {
      throw new Error('VehicleManager has been disposed.');
    }

    const requestId = ++loadSequence;

    notifyProgress(
      { phase: 'start', loaded: 0, total: 0 },
      model
    );

    let gltf;

    try {
      gltf = await loader.loadAsync(url, event => {
        if (requestId !== loadSequence || disposed) return;

        notifyProgress(event, model);
      });
    } catch (error) {
      throw error;
    }

    const gltfScene = gltf.scene;

    if (requestId !== loadSequence || disposed) {
      disposeModelResources(gltfScene);

      const error = new Error('Vehicle loading was superseded.');
      error.name = 'AbortError';
      throw error;
    }

    let nextRoot;

    try {
      nextRoot = normalizeModel(gltfScene, model.name);
    } catch (error) {
      disposeModelResources(gltfScene);
      throw error;
    }

    if (requestId !== loadSequence || disposed) {
      disposeModelResources(nextRoot);

      const error = new Error('Vehicle loading was superseded.');
      error.name = 'AbortError';
      throw error;
    }

    const previousRoot = activeRoot;

    notifyBeforeReplace(previousRoot, nextRoot);

    try {
      scene.add(nextRoot);
    } catch (error) {
      disposeModelResources(nextRoot);
      throw error;
    }

    // Commit the new active vehicle only after it has been added.
    activeRoot = nextRoot;
    activeModel = { ...model };

    if (previousRoot) {
      previousRoot.removeFromParent();
      disposeModelResources(previousRoot);
    }

    notifyProgress(
      { phase: 'complete', loaded: 1, total: 1 },
      model
    );

    return {
      root: nextRoot,
      model: { ...model },
      animations: gltf.animations || []
    };
  }

  async function loadModel(id) {
    if (disposed) {
      throw new Error('VehicleManager has been disposed.');
    }

    const model = catalog.get(id);

    if (!model) {
      throw new Error(`Vehicle model "${id}" is not registered.`);
    }

    return loadSource(model, model.url);
  }

  async function importFile(file) {
    if (disposed) {
      throw new Error('VehicleManager has been disposed.');
    }

    if (!file) {
      throw new Error('No vehicle file was selected.');
    }

    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension !== 'glb') {
      throw new Error(
        'Please import a .glb file. Standalone .gltf files may require external assets.'
      );
    }

    if (file.size === 0) {
      throw new Error('The selected GLB file is empty.');
    }

    const safeName = file.name
      .replace(/\.glb$/i, '')
      .replace(/[_-]+/g, ' ')
      .trim() || 'Imported vehicle';

    const id = `imported-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;

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
      const result = await loadSource(model, url);

      if (disposed) {
        throw new Error('VehicleManager has been disposed.');
      }

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

    for (const url of importedUrls) {
      URL.revokeObjectURL(url);
    }

    importedUrls.clear();
    catalog.clear();
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
