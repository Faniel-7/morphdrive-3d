import * as THREE from 'three';

/**
 * Collects model hierarchy information without changing the model.
 */
export function analyzeVehicleComponents(root) {
  if (!root) {
    return {
      totalObjects: 0,
      meshObjects: 0,
      namedObjects: [],
      duplicateNames: [],
      bounds: null
    };
  }

  const nameCounts = new Map();
  const namedObjects = [];

  let totalObjects = 0;
  let meshObjects = 0;

  root.traverse((object) => {
    totalObjects++;

    if (object.isMesh || object.isSkinnedMesh) {
      meshObjects++;
    }

    if (object.name) {
      nameCounts.set(
        object.name,
        (nameCounts.get(object.name) || 0) + 1
      );

      namedObjects.push({
        name: object.name,
        type: object.type,
        isMesh: Boolean(object.isMesh || object.isSkinnedMesh),
        children: object.children.length
      });
    }
  });

  root.updateWorldMatrix(true, true);

  const bounds = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();

  if (!bounds.isEmpty()) {
    bounds.getSize(size);
  }

  const duplicateNames = [...nameCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([name, count]) => ({ name, count }));

  return {
    totalObjects,
    meshObjects,
    namedObjects,
    duplicateNames,
    bounds: bounds.isEmpty()
      ? null
      : {
          min: bounds.min.toArray(),
          max: bounds.max.toArray(),
          size: size.toArray()
        }
  };
}

/**
 * Checks whether an object or one of its descendants contains renderable
 * geometry. Empty organizational groups are not useful explosion targets.
 */
export function hasRenderableDescendant(object) {
  if (!object) return false;

  let found = false;

  object.traverse((child) => {
    if (
      child.isMesh ||
      child.isSkinnedMesh ||
      child.isInstancedMesh
    ) {
      found = true;
    }
  });

  return found;
}

/**
 * Returns the hierarchy depth of an object.
 */
export function getObjectDepth(object) {
  let depth = 0;
  let current = object;

  while (current.parent) {
    depth++;
    current = current.parent;
  }

  return depth;
}
