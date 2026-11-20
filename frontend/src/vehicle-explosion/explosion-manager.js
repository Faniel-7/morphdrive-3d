

import * as THREE from 'three';

import { getExplosionConfig } from './explosion-config.js';

import {
  getObjectDepth
} from './vehicle-analyzer.js';

const ORIGINAL_POSITION_KEY =
  '__morphDriveExplosionOriginalPosition';

function isRenderableObject(object) {
  return Boolean(
    object &&
    (
      object.isMesh ||
      object.isSkinnedMesh ||
      object.isInstancedMesh
    )
  );
}

function countRenderableObjects(root) {
  let count = 0;

  root.traverse(object => {
    if (isRenderableObject(object)) count++;
  });

  return count;
}

function countRenderableDescendants(root) {
  let count = 0;

  root.traverse(object => {
    if (isRenderableObject(object)) count++;
  });

  return count;
}

function isDescendantOf(object, ancestor) {
  let current = object.parent;

  while (current) {
    if (current === ancestor) return true;
    current = current.parent;
  }

  return false;
}

/**
 * Kawasaki-specific selection:
 * select the exact named parent groups from the hover report.
 * Their child meshes move together with their parent.
 */
function getHierarchyPartCandidates(root, config) {
  const configuredNames = new Set(config.parts ?? []);
  const matches = [];

  root.traverse(object => {
    if (!configuredNames.has(object.name)) return;

    if (countRenderableDescendants(object) === 0) return;

    matches.push(object);
  });

  // Avoid moving a selected parent and one of its selected children twice.
  return matches.filter(object =>
    !matches.some(other =>
      other !== object && isDescendantOf(object, other)
    )
  );
}

/**
 * Existing selection behavior for vehicles that do not use
 * the new hierarchy-parts strategy.
 */
function getLegacyExplosionCandidates(root) {
  const selected = [];

  root.traverse(object => {
    if (!isRenderableObject(object)) return;

    let parent = object.parent;
    let coveredByRenderableParent = false;

    while (parent) {
      if (isRenderableObject(parent)) {
        coveredByRenderableParent = true;
        break;
      }

      parent = parent.parent;
    }

    if (!coveredByRenderableParent) {
      selected.push(object);
    }
  });

  return selected;
}

function getExplosionCandidates(root, config) {
  if (config?.strategy === 'inspect-only') {
    return [];
  }

  if (config?.strategy === 'hierarchy-parts') {
    return getHierarchyPartCandidates(root, config);
  }

  return getLegacyExplosionCandidates(root);
}

function getMissingConfiguredParts(root, config) {
  if (config?.strategy !== 'hierarchy-parts') {
    return [];
  }

  const foundNames = new Set();

  root.traverse(object => {
    if (object.name) foundNames.add(object.name);
  });

  return (config.parts ?? []).filter(name =>
    !foundNames.has(name)
  );
}

function getObjectWorldCenter(object) {
  const bounds = new THREE.Box3().setFromObject(object);

  if (!bounds.isEmpty()) {
    return bounds.getCenter(new THREE.Vector3());
  }

  return object.getWorldPosition(new THREE.Vector3());
}

function getStableDirection(vector, index) {
  if (vector.lengthSq() > 0.000001) {
    return vector.normalize();
  }

  const fallback = [
    new THREE.Vector3(1, 0.45, 0),
    new THREE.Vector3(-1, 0.45, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, -1)
  ];

  return fallback[index % fallback.length]
    .clone()
    .normalize();
}

function getExplosionDistance(root, factor) {
  const bounds = new THREE.Box3().setFromObject(root);

  if (bounds.isEmpty()) return 1;

  const diagonal = bounds.getSize(
    new THREE.Vector3()
  ).length();

  return Math.max(diagonal * factor, 0.35);
}

export function createExplosionManager({
  root,
  vehicleId,
  distanceFactor = 0.16
}) {
  if (!root) {
    throw new Error(
      'createExplosionManager requires a valid Three.js root object.'
    );
  }

  if (!vehicleId) {
    throw new Error(
      'createExplosionManager requires a vehicleId.'
    );
  }

  const config = getExplosionConfig(vehicleId);

  let exploded = false;
  let selectedParts = [];

  function getStatus() {
    const renderableObjectCount =
      countRenderableObjects(root);

    const selectedRenderableCount =
      selectedParts.reduce(
        (total, object) =>
          total + countRenderableDescendants(object),
        0
      );

    return {
      vehicleId,
      strategy: config.strategy,
      exploded,
      selectedCount: selectedParts.length,
      configuredCount: config.parts.length,
      renderableObjectCount,
      selectedRenderableCount,
      uncoveredRenderableCount:
        renderableObjectCount - selectedRenderableCount,
      missingConfiguredParts:
        getMissingConfiguredParts(root, config),
      report: config.report
    };
  }

  function getAvailableParts() {
    if (config.strategy === 'legacy-sedan') {
      return [];
    }

    root.updateWorldMatrix(true, true);

    return getExplosionCandidates(root, config).map(object => {
      const bounds = new THREE.Box3().setFromObject(object);

      const size = bounds.isEmpty()
        ? new THREE.Vector3()
        : bounds.getSize(new THREE.Vector3());

      return {
        name: object.name || '(unnamed component)',
        type: object.type,
        depth: getObjectDepth(object),
        isMesh: Boolean(object.isMesh),
        isSkinnedMesh: Boolean(object.isSkinnedMesh),
        isInstancedMesh: Boolean(object.isInstancedMesh),
        meshCount: countRenderableDescendants(object),
        localPosition: object.position.toArray(),
        worldCenter: getObjectWorldCenter(object).toArray(),
        bounds: bounds.isEmpty() ? null : {
          min: bounds.min.toArray(),
          max: bounds.max.toArray()
        },
        size: size.toArray()
      };
    });
  }

  function explode() {
    if (exploded) {
      return {
        success: true,
        alreadyExploded: true,
        ...getStatus()
      };
    }

    if (config.strategy === 'legacy-sedan') {
      return {
        success: false,
        reason:
          'The Sedan uses its existing specialized explosion handler.',
        ...getStatus()
      };
    }

    root.updateWorldMatrix(true, true);

    selectedParts = getExplosionCandidates(root, config);

    if (selectedParts.length === 0) {
      return {
        success: false,
        reason:
          config.strategy === 'hierarchy-parts'
            ? 'None of the configured hierarchy components were found.'
            : 'No suitable renderable components were discovered.',
        ...getStatus()
      };
    }

    const vehicleBounds = new THREE.Box3().setFromObject(root);

    if (vehicleBounds.isEmpty()) {
      selectedParts = [];

      return {
        success: false,
        reason: 'The loaded vehicle has no measurable geometry.',
        ...getStatus()
      };
    }

   const vehicleCenter = vehicleBounds.getCenter(
  new THREE.Vector3()
);

const vehicleDiagonal = vehicleBounds
  .getSize(new THREE.Vector3())
  .length();

    const vehicleDistanceFactor =
      vehicleId === 'kawasaki-ninja-h2' ? 0.40 : distanceFactor;

    const distance = getExplosionDistance(
      root,
      vehicleDistanceFactor
    );

console.log('MORPHDRIVE EXPLOSION DISTANCE CHECK', {
  vehicleId,
  vehicleDistanceFactor,
  calculatedDistance: distance,
  selectedParts: selectedParts.length
});
    const movements = [];

   
selectedParts.forEach((object, index) => {
  if (!object.parent) return;

  if (!object.userData[ORIGINAL_POSITION_KEY]) {
    object.userData[ORIGINAL_POSITION_KEY] =
      object.position.clone();
  }

  const worldCenter = getObjectWorldCenter(object);

  // Measure this component's size.
  const partBounds = new THREE.Box3().setFromObject(object);

  const partDiagonal = partBounds.isEmpty()
    ? 0
    : partBounds.getSize(new THREE.Vector3()).length();

  // Normalize component size relative to the whole vehicle.
  const sizeRatio = THREE.MathUtils.clamp(
    partDiagonal / Math.max(vehicleDiagonal, 0.0001),
    0,
    1
  );

  // Components near the vehicle center receive more separation.
  const centerDistance = worldCenter.distanceTo(vehicleCenter);

  const centrality = 1 - THREE.MathUtils.clamp(
    centerDistance / Math.max(vehicleDiagonal * 0.5, 0.0001),
    0,
    1
  );

  // Different components receive different explosion distances.
  const distanceMultiplier =
    0.65 +
    sizeRatio * 0.7 +
    centrality * 0.55;

  const partDistance = distance * distanceMultiplier;

  const direction = getStableDirection(
    worldCenter.clone().sub(vehicleCenter),
    index
  );

  const worldOffset = direction.multiplyScalar(partDistance);

    // Keep Realistic Helicopter components above the showroom floor.
  if (
    vehicleId === 'realistic-helicopter' &&
    !partBounds.isEmpty()
  ) {
    const minimumFloorClearance = 0.12;

    const projectedBottom =
      partBounds.min.y + worldOffset.y;

    if (projectedBottom < minimumFloorClearance) {
      worldOffset.y +=
        minimumFloorClearance - projectedBottom;
    }
  }

  const parent = object.parent;

  const localStart = parent.worldToLocal(
    worldCenter.clone()
  );

  const localEnd = parent.worldToLocal(
    worldCenter.clone().add(worldOffset)
  );

  const localOffset = localEnd.sub(localStart);

  movements.push({
    object,
    position: object.userData[ORIGINAL_POSITION_KEY]
      .clone()
      .add(localOffset)
  });
});


    for (const movement of movements) {
      movement.object.position.copy(movement.position);
    }

    root.updateWorldMatrix(true, true);

    exploded = true;

    return {
      success: true,
      ...getStatus()
    };
  }

  function assemble() {
    if (!exploded) {
      return {
        success: true,
        alreadyAssembled: true,
        ...getStatus()
      };
    }

    for (const object of selectedParts) {
      const originalPosition =
        object.userData[ORIGINAL_POSITION_KEY];

      if (originalPosition) {
        object.position.copy(originalPosition);

        delete object.userData[ORIGINAL_POSITION_KEY];
      }
    }

    root.updateWorldMatrix(true, true);

    exploded = false;

    return {
      success: true,
      ...getStatus()
    };
  }

  function dispose() {
    if (exploded) {
      assemble();
    }

    selectedParts = [];
  }

  return {
    explode,
    assemble,
    dispose,
    getStatus,
    getAvailableParts
  };
}

