import * as THREE from 'three';

/**
 * Analyze the loaded vehicle without modifying its hierarchy.
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
  let skinnedMeshes = 0;
  let instancedMeshes = 0;

  root.traverse(object => {
    totalObjects++;

    if (object.isMesh || object.isSkinnedMesh) {
      meshObjects++;
    }

    if (object.isSkinnedMesh) {
      skinnedMeshes++;
    }

    if (object.isInstancedMesh) {
      instancedMeshes++;
    }

    if (object.name) {
      nameCounts.set(
        object.name,
        (nameCounts.get(object.name) || 0) + 1
      );

      namedObjects.push({
        name: object.name,
        type: object.type,
        isMesh: Boolean(object.isMesh),
        isSkinnedMesh: Boolean(object.isSkinnedMesh),
        isInstancedMesh: Boolean(object.isInstancedMesh),
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
    skinnedMeshes,
    instancedMeshes,
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
 * Checks whether an object or one of its descendants contains
 * renderable geometry.
 */
export function hasRenderableDescendant(object) {
  if (!object) return false;

  let found = false;

  object.traverse(child => {
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

/**
 * Collect renderable objects belonging to a hierarchy node.
 */
function collectRenderableObjects(object) {
  const meshes = [];

  object.traverse(child => {
    if (
      child.isMesh ||
      child.isSkinnedMesh ||
      child.isInstancedMesh
    ) {
      meshes.push(child);
    }
  });

  return meshes;
}

/**
 * Check whether a node contains a skeletal structure.
 *
 * Bones must not be treated as ordinary movable assemblies.
 * Moving a bone-containing group can break a skinned model.
 */
function containsBones(object) {
  let found = false;

  object.traverse(child => {
    if (child.isBone) {
      found = true;
    }
  });

  return found;
}

/**
 * Calculate the approximate geometry size of an object.
 */
function getObjectBounds(object) {
  const bounds = new THREE.Box3().setFromObject(object);

  if (bounds.isEmpty()) return null;

  const size = bounds.getSize(new THREE.Vector3());

  return {
    bounds,
    size,
    diagonal: size.length(),
    volume: size.x * size.y * size.z
  };
}

/**
 * Discover useful non-overlapping component assemblies.
 *
 * This is a discovery step, not an explosion operation.
 * It intentionally avoids skeletal structures and tiny fragments.
 */
export function discoverHierarchyCandidates(root, options = {}) {
  if (!root) return [];

  const {
    minMeshCount = 2,
    minRelativeSize = 0.012,
    maxRelativeSize = 0.92,
    maxDepth = 12
  } = options;

  root.updateWorldMatrix(true, true);

  const vehicleBounds = new THREE.Box3().setFromObject(root);

  if (vehicleBounds.isEmpty()) return [];

  const vehicleSize = vehicleBounds.getSize(new THREE.Vector3());
  const vehicleDiagonal = Math.max(vehicleSize.length(), 0.0001);

  const records = [];

  root.traverse(object => {
    if (object === root) return;
    if (!object.children.length) return;
    if (containsBones(object)) return;

    const meshes = collectRenderableObjects(object);

    if (meshes.length < minMeshCount) return;

    const objectBounds = getObjectBounds(object);

    if (!objectBounds) return;

    const relativeSize =
      objectBounds.diagonal / vehicleDiagonal;

    if (relativeSize < minRelativeSize) return;
    if (relativeSize > maxRelativeSize) return;

    const depth = getObjectDepth(object);

    if (depth > maxDepth) return;

    records.push({
      object,
      name: object.name || '(unnamed group)',
      type: object.type,
      depth,
      meshCount: meshes.length,
      relativeSize,
      bounds: objectBounds.bounds
    });
  });

  // Prefer larger assemblies first, then shallower hierarchy nodes.
  records.sort((a, b) => {
    if (b.meshCount !== a.meshCount) {
      return b.meshCount - a.meshCount;
    }

    return a.depth - b.depth;
  });

  // Keep only non-overlapping assemblies.
  const selected = [];

  for (const candidate of records) {
    const overlaps = selected.some(existing => {
      let current = candidate.object;

      while (current) {
        if (current === existing.object) {
          return true;
        }

        current = current.parent;
      }

      return false;
    });

    if (!overlaps) {
      selected.push(candidate);
    }
  }

  return selected.map(candidate => ({
    object: candidate.object,
    name: candidate.name,
    type: candidate.type,
    depth: candidate.depth,
    meshCount: candidate.meshCount,
    relativeSize: Number(
      candidate.relativeSize.toFixed(4)
    )
  }));
}