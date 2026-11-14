
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Loads, normalizes, swaps, imports, and disposes vehicle models.
 *
 * Built-in models are registered by URL.
 * User imports are restricted to valid GLB files.
 */
export function createVehicleManager({
  scene,
  onBeforeReplace = () => {},
  onProgress = () => {},
  targetSize = 5
}) {
  if (!scene?.isScene && !scene?.isObject3D) {
    throw new Error(
      'VehicleManager requires a valid Three.js scene or group.'
    );
  }

  if (!Number.isFinite(targetSize) || targetSize <= 0) {
    throw new Error(
      'VehicleManager targetSize must be a positive number.'
    );
  }

  const loader = new GLTFLoader();
  const catalog = new Map();
  const importedUrls = new Set();

  let activeRoot = null;
  let activeModel = null;
  let loadSequence = 0;
  let disposed = false;

  // --------------------------------------------------
  // ERROR HELPERS
  // --------------------------------------------------

  function createAbortError(
    message = 'Vehicle loading was superseded.'
  ) {
    const error = new Error(message);
    error.name = 'AbortError';
    return error;
  }

  function ensureActiveRequest(requestId) {
    if (disposed || requestId !== loadSequence) {
      throw createAbortError();
    }
  }

  // --------------------------------------------------
  // CALLBACK HELPERS
  // --------------------------------------------------

  function notifyProgress(event, model) {
    try {
      onProgress(event, model);
    } catch (error) {
      console.warn(
        'VehicleManager progress callback failed:',
        error
      );
    }
  }

  function notifyBeforeReplace(previousRoot, nextRoot) {
    try {
      onBeforeReplace(previousRoot, nextRoot);
    } catch (error) {
      console.warn(
        'VehicleManager replacement callback failed:',
        error
      );
    }
  }

  // --------------------------------------------------
  // RESOURCE COLLECTION
  // --------------------------------------------------

  function collectResources(root) {
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    const skeletons = new Set();

    if (!root) {
      return {
        geometries,
        materials,
        textures,
        skeletons
      };
    }

    function collectTexture(value, visited = new WeakSet()) {
      if (!value || typeof value !== 'object') {
        return;
      }

      if (value.isTexture) {
        textures.add(value);
        return;
      }

      if (visited.has(value)) return;
      visited.add(value);

      if (Array.isArray(value)) {
        for (const item of value) {
          collectTexture(item, visited);
        }
        return;
      }

      // Only inspect plain objects, such as uniform structures.
      const prototype = Object.getPrototypeOf(value);

      if (
        prototype === Object.prototype ||
        prototype === null
      ) {
        for (const item of Object.values(value)) {
          collectTexture(item, visited);
        }
      }
    }

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
          collectTexture(value);
        }

        if (material.uniforms) {
          for (const uniform of Object.values(material.uniforms)) {
            collectTexture(uniform?.value);
          }
        }
      }
    });

    return {
      geometries,
      materials,
      textures,
      skeletons
    };
  }

  /**
   * Disposes resources belonging to root.
   *
   * Resources also used by preserveRoot are protected.
   * This prevents accidental disposal of shared resources.
   */
  function disposeModelResources(root, preserveRoot = null) {
    if (!root) return;

    const resources = collectResources(root);
    const protectedResources = collectResources(preserveRoot);

    for (const texture of resources.textures) {
      if (!protectedResources.textures.has(texture)) {
        texture.dispose();
      }
    }

    for (const material of resources.materials) {
      if (!protectedResources.materials.has(material)) {
        material.dispose();
      }
    }

    for (const geometry of resources.geometries) {
      if (!protectedResources.geometries.has(geometry)) {
        geometry.dispose();
      }
    }

    for (const skeleton of resources.skeletons) {
      if (!protectedResources.skeletons.has(skeleton)) {
        skeleton.dispose();
      }
    }
  }

  // --------------------------------------------------
  // MODEL NORMALIZATION
  // --------------------------------------------------

  /**
   * Uses a wrapper group so the original GLTF scene transforms
   * are preserved instead of being overwritten.
   *
   * The existing normalization behavior is intentionally preserved.
   */
  function normalizeModel(gltfScene, modelName) {
    if (!gltfScene?.isObject3D) {
      throw new Error(
        'The selected GLB does not contain a valid 3D scene.'
      );
    }

    const wrapper = new THREE.Group();

    wrapper.name = `${modelName || 'Vehicle'}_Normalized`;

    wrapper.add(gltfScene);

    wrapper.updateMatrixWorld(true);

    const bounds = new THREE.Box3().setFromObject(wrapper);

    if (bounds.isEmpty()) {
      throw new Error(
        'The selected vehicle contains no visible 3D geometry.'
      );
    }

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
      throw new Error(
        'The selected vehicle has invalid or empty 3D geometry.'
      );
    }

    const scale = targetSize / largestDimension;

    wrapper.scale.setScalar(scale);

    // Preserve the original centering and ground alignment.
    wrapper.position.set(
      -center.x * scale,
      -bounds.min.y * scale,
      -center.z * scale
    );

    wrapper.updateMatrixWorld(true);

    return wrapper;
  }

  // --------------------------------------------------
  // MODEL REGISTRATION
  // --------------------------------------------------

  function registerModel(model) {
    if (
      typeof model?.id !== 'string' ||
      !model.id.trim() ||
      typeof model?.name !== 'string' ||
      !model.name.trim() ||
      typeof model?.url !== 'string' ||
      !model.url.trim()
    ) {
      throw new Error(
        'A vehicle model requires a valid id, name, and URL.'
      );
    }

    if (disposed) {
      throw new Error(
        'VehicleManager has been disposed.'
      );
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
    return [...catalog.values()].map(model => ({
      ...model
    }));
  }

  function getActiveModel() {
    return activeModel
      ? { ...activeModel }
      : null;
  }

  // --------------------------------------------------
  // MODEL LOADING
  // --------------------------------------------------

  async function loadSource(model, url) {
    if (disposed) {
      throw new Error(
        'VehicleManager has been disposed.'
      );
    }

    const requestId = ++loadSequence;

    notifyProgress(
      {
        phase: 'start',
        loaded: 0,
        total: 0
      },
      model
    );

    ensureActiveRequest(requestId);

    let gltf;

    try {
      gltf = await loader.loadAsync(url, event => {
        if (
          requestId !== loadSequence ||
          disposed
        ) {
          return;
        }

        notifyProgress(event, model);
      });
    } catch (error) {
      if (
        disposed ||
        requestId !== loadSequence
      ) {
        throw createAbortError();
      }

      throw error;
    }

    const gltfScene = gltf?.scene;

    // A request may become outdated while GLTFLoader is working.
    // Release its resources instead of leaving them in memory.
    if (
      disposed ||
      requestId !== loadSequence
    ) {
      disposeModelResources(gltfScene, activeRoot);
      throw createAbortError();
    }

    if (!gltfScene?.isObject3D) {
      throw new Error(
        'The GLB file does not contain a valid default scene.'
      );
    }

    let nextRoot;

    try {
      nextRoot = normalizeModel(
        gltfScene,
        model.name
      );
    } catch (error) {
      disposeModelResources(gltfScene, activeRoot);
      throw error;
    }

    // Check again before touching the active vehicle.
    if (
      disposed ||
      requestId !== loadSequence
    ) {
      disposeModelResources(nextRoot, activeRoot);
      throw createAbortError();
    }

    const previousRoot = activeRoot;

    // Reset hover and other replacement-related state.
    notifyBeforeReplace(previousRoot, nextRoot);

    // The callback itself could have triggered another load.
    ensureActiveRequest(requestId);

    try {
      scene.add(nextRoot);
    } catch (error) {
      nextRoot.removeFromParent();
      disposeModelResources(nextRoot, previousRoot);
      throw error;
    }

    // Commit the new vehicle after successful insertion.
    activeRoot = nextRoot;
    activeModel = { ...model };

    // Remove the previous vehicle and protect any shared resources.
    if (previousRoot) {
      previousRoot.removeFromParent();

      disposeModelResources(
        previousRoot,
        nextRoot
      );
    }

    notifyProgress(
      {
        phase: 'complete',
        loaded: 1,
        total: 1
      },
      model
    );

    return {
      root: nextRoot,
      model: { ...model },
      animations: gltf.animations || []
    };
  }

  // --------------------------------------------------
  // LOAD REGISTERED MODEL
  // --------------------------------------------------

  async function loadModel(id) {
    if (disposed) {
      throw new Error(
        'VehicleManager has been disposed.'
      );
    }

    const model = catalog.get(id);

    if (!model) {
      throw new Error(
        `Vehicle model "${id}" is not registered.`
      );
    }

    return loadSource(model, model.url);
  }

  // --------------------------------------------------
  // GLB FILE VALIDATION
  // --------------------------------------------------

  async function validateGlbFile(file) {
    if (!file) {
      throw new Error(
        'No vehicle file was selected.'
      );
    }

    const extension = file.name
      .split('.')
      .pop()
      ?.toLowerCase();

    if (extension !== 'glb') {
      throw new Error(
        'Please import a .glb file. Standalone .gltf files may require external assets.'
      );
    }

    if (!Number.isFinite(file.size) || file.size < 12) {
      throw new Error(
        'The selected GLB file is empty or too small to be valid.'
      );
    }

    // A GLB file starts with the four-byte magic value "glTF".
    const header = await file.slice(0, 12).arrayBuffer();

    if (header.byteLength !== 12) {
      throw new Error(
        'Could not read the GLB file header.'
      );
    }

    const view = new DataView(header);

    const magic = view.getUint32(0, true);
    const version = view.getUint32(4, true);
    const declaredLength = view.getUint32(8, true);

    const GLB_MAGIC = 0x46546c67;

    if (magic !== GLB_MAGIC) {
      throw new Error(
        'This file is not a valid GLB file.'
      );
    }

    if (version !== 2) {
      throw new Error(
        'Unsupported GLB version. Please use GLB 2.0.'
      );
    }

    if (
      declaredLength < 12 ||
      declaredLength > file.size
    ) {
      throw new Error(
        'The GLB file header contains an invalid file length.'
      );
    }

    return true;
  }

  // --------------------------------------------------
  // IMPORT GLB FILE
  // --------------------------------------------------

  async function importFile(file) {
    if (disposed) {
      throw new Error(
        'VehicleManager has been disposed.'
      );
    }

    // Validate before creating a URL or starting a model load.
    await validateGlbFile(file);

    if (disposed) {
      throw new Error(
        'VehicleManager has been disposed.'
      );
    }

    const safeName = file.name
      .replace(/\.glb$/i, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
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
        throw createAbortError(
          'VehicleManager was disposed during import.'
        );
      }

      // Register only successfully loaded imports.
      catalog.set(id, model);

      return result;
    } catch (error) {
      // Failed and superseded imports release their URLs.
      URL.revokeObjectURL(url);
      importedUrls.delete(url);

      throw error;
    }
  }

  // --------------------------------------------------
  // DISPOSAL
  // --------------------------------------------------

  function dispose() {
    if (disposed) return;

    disposed = true;

    // Invalidate all outstanding loading requests.
    loadSequence++;

    if (activeRoot) {
      activeRoot.removeFromParent();

      disposeModelResources(activeRoot);

      activeRoot = null;
    }

    // Release every imported object URL.
    for (const url of importedUrls) {
      URL.revokeObjectURL(url);
    }

    importedUrls.clear();

    catalog.clear();

    activeModel = null;
  }

  // --------------------------------------------------
  // PUBLIC API
  // --------------------------------------------------

  return {
    registerModel,
    getCatalog,
    getActiveModel,
    loadModel,
    importFile,
    dispose
  };
}
