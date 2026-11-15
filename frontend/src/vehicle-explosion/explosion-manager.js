
import * as THREE from 'three';

import { getExplosionConfig } from './explosion-config.js';

import {
  hasRenderableDescendant,
  getObjectDepth
} from './vehicle-analyzer.js';

const ORIGINAL_POSITION_KEY =
  '__morphDriveExplosionOriginalPosition';

function isDescendantOf(object, ancestor) {
  let current = object.parent;

  while (current) {
    if (current === ancestor) return true;
    current = current.parent;
  }

  return false;
}

function getNamedCandidates(root, configuredNames) {
  const wantedNames = new Set(configuredNames);
  const matches = [];

  root.traverse(object => {
    if (
      object.name &&
      wantedNames.has(object.name) &&
      hasRenderableDescendant(object)
    ) {
      matches.push(object);
    }
  });

  // Prefer the highest configured assembly in the hierarchy.
  matches.sort(
    (a, b) => getObjectDepth(a) - getObjectDepth(b)
  );

  const selected = [];

  for (const candidate of matches) {
    const covered = selected.some(
      existing =>
        candidate === existing ||
        isDescendantOf(candidate, existing)
    );

    if (!covered) selected.push(candidate);
  }

  return selected;
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

  return fallback[index % fallback.length].clone().normalize();
}

function getExplosionDistance(root, factor) {
  const bounds = new THREE.Box3().setFromObject(root);

  if (bounds.isEmpty()) return 1;

  const diagonal = bounds.getSize(new THREE.Vector3()).length();

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
    return {
      vehicleId,
      strategy: config.strategy,
      exploded,
      selectedCount: selectedParts.length,
      configuredCount: config.parts.length,
      report: config.report
    };
  }

  function getAvailableParts() {
    if (config.strategy !== 'named-parts') return [];

    root.updateWorldMatrix(true, true);

    return getNamedCandidates(root, config.parts).map(object => ({
      name: object.name,
      type: object.type,
      depth: getObjectDepth(object),
      isMesh: Boolean(object.isMesh),
      isSkinnedMesh: Boolean(object.isSkinnedMesh)
    }));
  }

  function explode() {
    if (exploded) {
      return {
        success: true,
        alreadyExploded: true,
        ...getStatus()
      };
    }

    if (config.strategy !== 'named-parts') {
      return {
        success: false,
        reason:
          config.strategy === 'legacy-sedan'
            ? 'The Sedan uses its existing specialized explosion handler.'
            : 'This model needs a verified component strategy before it can be safely exploded.',
        ...getStatus()
      };
    }

    root.updateWorldMatrix(true, true);

    selectedParts = getNamedCandidates(root, config.parts);

    if (selectedParts.length === 0) {
      return {
        success: false,
        reason: 'No configured component assemblies were found.',
        missingNames: config.parts,
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

    const distance = getExplosionDistance(root, distanceFactor);

    const movements = [];

    selectedParts.forEach((object, index) => {
      if (!object.parent) return;

      if (!object.userData[ORIGINAL_POSITION_KEY]) {
        object.userData[ORIGINAL_POSITION_KEY] =
          object.position.clone();
      }

      const worldCenter = getObjectWorldCenter(object);

      const direction = getStableDirection(
        worldCenter.clone().sub(vehicleCenter),
        index
      );

      const worldOffset = direction.multiplyScalar(distance);

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
    if (exploded) assemble();
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
