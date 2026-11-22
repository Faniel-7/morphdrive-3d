import * as THREE from 'three';

import { getExplosionConfig } from './explosion-config.js';
import { getA320ExplosionPlan } from './airbus-a320-explosion.js';
import { getMANTGXExplosionPlan } from './man-tgx-explosion.js';
import { getSukhoiSU57ExplosionPlan } from './sukhoi-su57-explosion.js';
import { getHondaCBR650RExplosionPlan } from './honda-cbr650r-explosion.js';
import { getBMWS1000RRExplosionPlan } from './bmw-s1000rr-explosion.js';

import {
  getObjectDepth
} from './vehicle-analyzer.js';

const ORIGINAL_POSITION_KEY =
  '__morphDriveExplosionOriginalPosition';

// Sports Bike-only offsets: each original GLB mesh gets its own position.
const SPORTS_BIKE_EXPLOSION_OFFSETS = new Map([
  ['Bike_Frame_Bike_Frame_0', [0, 0.35, 0]],
  ['Suspension_Suspension_0', [-1.35, 0.65, 0.35]],
  ['Wheels_Wheels_0', [1.45, 1.25, 0]],
  ['Traction_Traction_0', [-1.25, 0.75, -0.85]],
  ['Gearshift_Gearshift_0', [-1.55, 0.3, -1.15]],
  ['Handlebar_Handlebar_0', [0, 1.45, 1.0]],
  ['Chain_Chain_0', [1.35, 0.45, -1.0]],
  ['Brakes_Brakes_0', [1.45, 0.55, 0.85]],
  ['Brake_Lever_Break_Lever_0', [0, 1.2, -1.5]],
  ['Bike068_Seat_0', [0, 1.35, -0.35]]
]);

/*
 * Three functional clusters and their individual components.
 *
 * Matching uses the original Blender mesh name. Multiple geometry
 * objects belonging to one original mesh are kept together.
 */
const HELICOPTER_COMPONENTS = [
  {
    cluster: 'fuselage-mechanical',
    name: 'Seahawk_RHBodyTex_0',
    aliases: ['Seahawk_RHBodyTex_0']
  },
  {
    cluster: 'fuselage-mechanical',
    name: 'Seahawk_LHBodyTex_0',
    aliases: ['Seahawk_LHBodyTex_0', 'Seahawk_LHBody_0']
  },
  {
    cluster: 'fuselage-mechanical',
    name: 'Seahawk_TireTread_0',
    aliases: ['Seahawk_TireTread_0']
  },
  {
    cluster: 'fuselage-mechanical',
    name: 'Seahawk_PaintedBlackSteel_0',
    aliases: ['Seahawk_PaintedBlackSteel_0']
  },
  {
    cluster: 'fuselage-mechanical',
    name: 'Seahawk_TopTex_0',
    aliases: ['Seahawk_TopTex_0', 'Seahawk_TopText_0']
  },
  {
    cluster: 'fuselage-mechanical',
    name: 'Seahawk_ReflectorRed_0',
    aliases: ['Seahawk_ReflectorRed_0']
  },
  {
    cluster: 'fuselage-mechanical',
    name: 'Seahawk_GlossyWhite_0',
    aliases: ['Seahawk_GlossyWhite_0']
  },
  {
    cluster: 'cabin-interior',
    name: 'Seahawk_SafetyOrange_0',
    aliases: ['Seahawk_SafetyOrange_0']
  },
  {
    cluster: 'cabin-interior',
    name: 'Seahawk_Aluminum_0',
    aliases: ['Seahawk_Aluminum_0']
  },
  {
    cluster: 'cabin-interior',
    name: 'Seahawk_FlatBlack_0',
    aliases: ['Seahawk_FlatBlack_0']
  },
  {
    cluster: 'cockpit',
    name: 'Seahawk_FrontSeat_0',
    aliases: ['Seahawk_FrontSeat_0']
  },
  {
    cluster: 'cockpit',
    name: 'Seahawk_Glass1_0',
    aliases: ['Seahawk_Glass1_0']
  },
  {
    cluster: 'cockpit',
    name: 'Seahawk_Trim2_0',
    aliases: ['Seahawk_Trim2_0']
  },
  {
    cluster: 'cockpit',
    name: 'Seahawk_Mirror_0',
    aliases: ['Seahawk_Mirror_0']
  }
];

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

function hasRenderableAncestor(object) {
  let parent = object.parent;

  while (parent) {
    if (isRenderableObject(parent)) return true;
    parent = parent.parent;
  }

  return false;
}

function getHierarchyPartCandidates(root, config) {
  const configuredNames = new Set(config.parts ?? []);
  const matches = [];

  root.traverse(object => {
    if (!configuredNames.has(object.name)) return;
    if (countRenderableDescendants(object) === 0) return;

    matches.push(object);
  });

  return matches.filter(object =>
    !matches.some(other =>
      other !== object && isDescendantOf(object, other)
    )
  );
}

function getLegacyExplosionCandidates(root) {
  const selected = [];

  root.traverse(object => {
    if (!isRenderableObject(object)) return;
    if (hasRenderableAncestor(object)) return;

    selected.push(object);
  });

  return selected;
}

function getExplosionCandidates(root, config) {
  if (config?.strategy === 'inspect-only') return [];

  if (config?.strategy === 'hierarchy-parts') {
    return getHierarchyPartCandidates(root, config);
  }

  return getLegacyExplosionCandidates(root);
}

function getMissingConfiguredParts(root, config) {
  if (config?.strategy !== 'hierarchy-parts') return [];

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
    new THREE.Vector3(1, 0.25, 0),
    new THREE.Vector3(-1, 0.25, 0),
    new THREE.Vector3(0, 0.35, 1),
    new THREE.Vector3(0, 0.35, -1),
    new THREE.Vector3(0.6, 1, 0.6),
    new THREE.Vector3(-0.6, 1, -0.6),
    new THREE.Vector3(0.6, -0.2, -0.6),
    new THREE.Vector3(-0.6, -0.2, 0.6)
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

/*
 * Build one record per original material component.
 *
 * This is important because Blender may have split one original
 * material mesh into multiple geometry objects during preprocessing.
 * Those objects receive the same offset and remain one component.
 */
function getHelicopterComponentRecords(root) {
  root.updateWorldMatrix(true, true);

  const renderableObjects = [];

  root.traverse(object => {
    if (!isRenderableObject(object)) return;
    if (hasRenderableAncestor(object)) return;

    renderableObjects.push(object);
  });

  const records = [];

  for (const definition of HELICOPTER_COMPONENTS) {
    const objects = renderableObjects.filter(object =>
      definition.aliases.some(alias =>
        object.name.includes(alias)
      )
    );

    if (objects.length === 0) continue;

    const bounds = new THREE.Box3();

    for (const object of objects) {
      bounds.union(new THREE.Box3().setFromObject(object));
    }

    if (bounds.isEmpty()) continue;

    records.push({
      name: definition.name,
      cluster: definition.cluster,
      objects,
      bounds,
      center: bounds.getCenter(new THREE.Vector3()),
      size: bounds.getSize(new THREE.Vector3()),
      diagonal: bounds.getSize(new THREE.Vector3()).length()
    });
  }

  return records;
}

function getClusterBounds(records, clusterName) {
  const bounds = new THREE.Box3();

  for (const record of records) {
    if (record.cluster === clusterName) {
      bounds.union(record.bounds);
    }
  }

  return bounds;
}

/*
 * Create a component direction relative to its own cluster.
 * Components move away from the cluster center, not away from
 * the center of the entire helicopter.
 */
function getComponentOffset(record, clusterBounds, index) {
  const clusterCenter = clusterBounds.getCenter(
    new THREE.Vector3()
  );

  const clusterSize = clusterBounds.getSize(
    new THREE.Vector3()
  );

  const clusterDiagonal = Math.max(
    clusterSize.length(),
    0.5
  );

  const direction = record.center.clone().sub(clusterCenter);

  if (direction.lengthSq() < 0.000001) {
    direction.copy(getStableDirection(
      new THREE.Vector3(),
      index
    ));
  } else {
    direction.normalize();
  }

  /*
   * Add a small deterministic variation so components whose
   * centers are close do not all travel along the same line.
   */
  const variation = getStableDirection(
    new THREE.Vector3(),
    index + 3
  );

  direction.addScaledVector(variation, 0.24).normalize();

  // Wider engineering-style exploded spacing.
  const separation =
    clusterDiagonal * 0.48 +
    record.diagonal * 0.13;

  return direction.multiplyScalar(separation);
}

function keepAboveFloor(offset, bounds, minimumClearance = 0.12) {
  if (!bounds || bounds.isEmpty()) return offset;

  const projectedBottom = bounds.min.y + offset.y;

  if (projectedBottom < minimumClearance) {
    offset.y += minimumClearance - projectedBottom;
  }

  return offset;
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
  let activeHelicopterRecords = [];
  let activeA320Groups = [];
  let activeMANGroups = [];
  let activeSukhoiGroups = [];
let activeHondaGroups = [];
let activeBMWGroups = [];

  // Smooth transitions for vehicle explosion and assembly.
  const EXPLOSION_ANIMATION_DURATION = 850;

  let animationFrame = null;
  let animationToken = 0;

  function captureObjectPositions() {
    const snapshot = [];

    root.traverse(object => {
      snapshot.push({
        object,
        position: object.position.clone()
      });
    });

    return snapshot;
  }

  function cancelPositionAnimation() {
    animationToken++;

    if (
      animationFrame !== null &&
      typeof cancelAnimationFrame === 'function'
    ) {
      cancelAnimationFrame(animationFrame);
    }

    animationFrame = null;
  }

  function animatePositionChanges(startSnapshot, endSnapshot) {
    if (typeof requestAnimationFrame !== 'function') return;

    const startPositions = new Map(
      startSnapshot.map(record => [record.object, record.position])
    );

    const transitions = [];

    for (const record of endSnapshot) {
      const start = startPositions.get(record.object);

      if (!start) continue;

      if (start.distanceToSquared(record.position) < 1e-8) {
        continue;
      }

      transitions.push({
        object: record.object,
        start,
        end: record.position.clone()
      });
    }

    if (transitions.length === 0) return;

    const token = ++animationToken;
    const startTime = performance.now();

    // Return objects to their starting positions before animating.
    for (const item of transitions) {
      item.object.position.copy(item.start);
    }

    root.updateWorldMatrix(true, true);

    function updateFrame(now) {
      if (token !== animationToken) return;

      const progress = THREE.MathUtils.clamp(
        (now - startTime) / EXPLOSION_ANIMATION_DURATION,
        0,
        1
      );

      // Smoothstep easing.
      const eased = progress * progress * (3 - 2 * progress);

      for (const item of transitions) {
        item.object.position.lerpVectors(
          item.start,
          item.end,
          eased
        );
      }

      root.updateWorldMatrix(true, true);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(updateFrame);
      } else {
        for (const item of transitions) {
          item.object.position.copy(item.end);
        }

        root.updateWorldMatrix(true, true);
        animationFrame = null;
      }
    }

    animationFrame = requestAnimationFrame(updateFrame);
  }


  const isHelicopter =
    vehicleId === 'realistic-helicopter';

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
      configuredCount: isHelicopter
        ? HELICOPTER_COMPONENTS.length
        : config.parts.length,
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
    if (config.strategy === 'legacy-sedan') return [];

    root.updateWorldMatrix(true, true);

    if (isHelicopter) {
      return getHelicopterComponentRecords(root).map(record => ({
        name: record.name,
        cluster: record.cluster,
        type: 'ComponentGroup',
        depth: null,
        isMesh: false,
        isSkinnedMesh: false,
        isInstancedMesh: false,
        meshCount: record.objects.length,
        localPosition: null,
        worldCenter: record.center.toArray(),
        bounds: {
          min: record.bounds.min.toArray(),
          max: record.bounds.max.toArray()
        },
        size: record.size.toArray()
      }));
    }

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

  function saveOriginalPosition(object) {
    if (!object.userData[ORIGINAL_POSITION_KEY]) {
      object.userData[ORIGINAL_POSITION_KEY] =
        object.position.clone();
    }
  }

  function correctSportsBikeWheelHeight() {
    if (vehicleId !== 'sports-bike') return;

    const wheelName = 'Wheels_Wheels_0';
    const liftMarker = '__morphDriveSportsBikeWheelLifted';
    const minimumHeight = 0.12;

    let wheel = null;

    root.traverse(object => {
      if (object.name === wheelName) wheel = object;
    });

    if (!wheel || !wheel.parent || wheel.userData[liftMarker]) {
      return;
    }

    root.updateWorldMatrix(true, true);

    const bounds = new THREE.Box3().setFromObject(wheel);

    if (bounds.isEmpty() || bounds.min.y >= minimumHeight) {
      wheel.userData[liftMarker] = true;
      return;
    }

    const liftAmount = minimumHeight - bounds.min.y;
    const worldCenter = bounds.getCenter(new THREE.Vector3());
    const parent = wheel.parent;

    const localStart = parent.worldToLocal(worldCenter.clone());
    const localEnd = parent.worldToLocal(
      worldCenter.clone().add(
        new THREE.Vector3(0, liftAmount, 0)
      )
    );

    wheel.position.add(localEnd.sub(localStart));
    wheel.userData[liftMarker] = true;

    root.updateWorldMatrix(true, true);

    const correctedBounds = new THREE.Box3().setFromObject(wheel);

    console.log('[Sports Bike] Wheel floor correction:', {
      liftAmount,
      correctedMinimumY: correctedBounds.min.y,
      wheelAboveSurface: correctedBounds.min.y >= minimumHeight - 0.001
    });
  }

  function applyWorldOffset(object, worldOffset, movements) {
    if (!object.parent) return;

    saveOriginalPosition(object);

    const worldCenter = getObjectWorldCenter(object);
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
  }

  function explodeHelicopter() {
    const records = getHelicopterComponentRecords(root);

    if (records.length === 0) {
      return {
        success: false,
        reason:
          'No matching helicopter component meshes were found. Check the original mesh names in the loaded GLB.',
        expectedComponents: HELICOPTER_COMPONENTS.map(
          component => component.name
        ),
        ...getStatus()
      };
    }

    activeHelicopterRecords = records;

    selectedParts = [
      ...new Set(records.flatMap(record => record.objects))
    ];

    const clusterNames = [
      'fuselage-mechanical',
      'cabin-interior',
      'cockpit'
    ];

    const clusterBounds = new Map();

    for (const clusterName of clusterNames) {
      clusterBounds.set(
        clusterName,
        getClusterBounds(records, clusterName)
      );
    }

    const movements = [];
    let componentIndex = 0;

    for (const record of records) {
      const bounds = clusterBounds.get(record.cluster);

      if (!bounds || bounds.isEmpty()) continue;

      const offset = getComponentOffset(
        record,
        bounds,
        componentIndex
      );

      keepAboveFloor(offset, record.bounds);

      /*
       * Every geometry object belonging to this original material
       * component receives the same offset.
       */
      for (const object of record.objects) {
        applyWorldOffset(object, offset, movements);
      }

      componentIndex++;
    }

    for (const movement of movements) {
      movement.object.position.copy(movement.position);
    }

    root.updateWorldMatrix(true, true);

    exploded = true;

    console.log('MORPHDRIVE HELICOPTER COMPONENT EXPLOSION', {
      clusters: clusterNames.map(name => ({
        name,
        componentCount: records.filter(
          record => record.cluster === name
        ).length
      })),
      componentsSeparated: records.length,
      geometryObjectsMoved: movements.length
    });

    return {
      success: true,
      layout: 'three-cluster-component-separation',
      componentsSeparated: records.length,
      geometryObjectsMoved: movements.length,
      ...getStatus()
    };
  }

  function explodeStandardVehicle() {
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

    correctSportsBikeWheelHeight();
    root.updateWorldMatrix(true, true);

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
      vehicleId === 'kawasaki-ninja-h2'
        ? 0.40
        : distanceFactor;

    const distance = getExplosionDistance(
      root,
      vehicleDistanceFactor
    );

    const movements = [];

    selectedParts.forEach((object, index) => {
      if (!object.parent) return;

      saveOriginalPosition(object);

      const worldCenter = getObjectWorldCenter(object);
      const partBounds = new THREE.Box3().setFromObject(object);

      const partDiagonal = partBounds.isEmpty()
        ? 0
        : partBounds.getSize(new THREE.Vector3()).length();

      const sizeRatio = THREE.MathUtils.clamp(
        partDiagonal / Math.max(vehicleDiagonal, 0.0001),
        0,
        1
      );

      const centerDistance =
        worldCenter.distanceTo(vehicleCenter);

      const centrality = 1 - THREE.MathUtils.clamp(
        centerDistance /
          Math.max(vehicleDiagonal * 0.5, 0.0001),
        0,
        1
      );

      const distanceMultiplier =
        0.65 +
        sizeRatio * 0.7 +
        centrality * 0.55;

      const partDistance = distance * distanceMultiplier;

      const direction = getStableDirection(
        worldCenter.clone().sub(vehicleCenter),
        index
      );

      const sportsBikeOffset =
        vehicleId === 'sports-bike'
          ? SPORTS_BIKE_EXPLOSION_OFFSETS.get(object.name)
          : null;

      const worldOffset = sportsBikeOffset
        ? new THREE.Vector3(...sportsBikeOffset)
        : direction.multiplyScalar(partDistance);

      applyWorldOffset(object, worldOffset, movements);
    });

    for (const movement of movements) {
      movement.object.position.copy(movement.position);
    }

    root.updateWorldMatrix(true, true);

    // Polestar 3-only floor correction.
    // Lift only components whose lowest point is below the grid.
    if (vehicleId === 'polestar-3') {
      const minimumHeight = 0.08;
      const worldUp = new THREE.Vector3(0, 1, 0);
      let liftedComponents = 0;

      for (const object of selectedParts) {
        if (!object.parent) continue;

        const bounds = new THREE.Box3().setFromObject(object);

        if (bounds.isEmpty() || bounds.min.y >= minimumHeight) {
          continue;
        }

        const liftAmount = minimumHeight - bounds.min.y;
        const worldCenter = bounds.getCenter(new THREE.Vector3());
        const parent = object.parent;

        const localStart = parent.worldToLocal(
          worldCenter.clone()
        );

        const localEnd = parent.worldToLocal(
          worldCenter.clone().add(
            worldUp.clone().multiplyScalar(liftAmount)
          )
        );

        object.position.add(localEnd.sub(localStart));
        liftedComponents++;

        root.updateWorldMatrix(true, true);
      }

      const remainingBelowGrid = selectedParts.filter(object => {
        if (!object.parent) return false;

        const bounds = new THREE.Box3().setFromObject(object);

        return (
          !bounds.isEmpty() &&
          bounds.min.y < minimumHeight - 0.001
        );
      });

      console.log('[Polestar 3] Floor correction:', {
        liftedComponents,
        componentsStillBelowGrid: remainingBelowGrid.length
      });
    }

    exploded = true;

    return {
      success: true,
      layout: 'standard-radial',
      ...getStatus()
    };
  }


  function explodeBMWS1000RR() {
    root.updateWorldMatrix(true, true);

    const plan = getBMWS1000RRExplosionPlan(root);

    if (plan.length === 0) {
      return {
        success: false,
        reason: 'No BMW S1000 RR explosion components were found.',
        ...getStatus()
      };
    }

    const movements = [];
    activeBMWGroups = [];

    for (const record of plan) {
      const object = record.object;
      if (!object.parent) continue;

      if (!object.userData[ORIGINAL_POSITION_KEY]) {
        object.userData[ORIGINAL_POSITION_KEY] = object.position.clone();
      }

      const worldPosition = object.getWorldPosition(
        new THREE.Vector3()
      );

      const parent = object.parent;

      const localStart = parent.worldToLocal(
        worldPosition.clone()
      );

      const localEnd = parent.worldToLocal(
        worldPosition.clone().add(
          new THREE.Vector3(...record.offset)
        )
      );

      movements.push({
        object,
        position: object.userData[ORIGINAL_POSITION_KEY]
          .clone()
          .add(localEnd.sub(localStart))
      });

      activeBMWGroups.push(object);
    }

    for (const movement of movements) {
      movement.object.position.copy(movement.position);
    }

    root.updateWorldMatrix(true, true);

    // Refresh only this BMW's skinned-mesh skeletons.
    root.traverse(object => {
      if (object.isSkinnedMesh && object.skeleton) {
        object.skeleton.update();
      }
    });

    selectedParts = [...activeBMWGroups];
    exploded = true;

    return {
      success: true,
      layout: 'bmw-s1000rr-rigged-assembly-explosion',
      componentsSeparated: activeBMWGroups.length,
      geometryObjectsMoved: movements.length,
      ...getStatus()
    };
  }

  function explodeA320() {
    const plan = getA320ExplosionPlan(root);

    if (plan.length === 0) {
      return {
        success: false,
        reason: 'No A320 component groups were found.',
        ...getStatus()
      };
    }

    selectedParts = [
      ...new Set(plan.flatMap(record => record.renderables))
    ];

    const movements = [];
    activeA320Groups = [];

    for (const record of plan) {
      if (!record.object.parent) continue;

      activeA320Groups.push(record.object);

      applyWorldOffset(
        record.object,
        record.offset,
        movements
      );
    }

    for (const movement of movements) {
      movement.object.position.copy(movement.position);
    }

    root.updateWorldMatrix(true, true);

    // A320-only: lift components that extend below the showroom grid.
    const minimumHeight = 0.08;
    const worldUp = new THREE.Vector3(0, 1, 0);
    const liftedComponents = [];

    for (const record of plan) {
      const object = record.object;
      if (!object.parent) continue;

      const bounds = new THREE.Box3().setFromObject(object);

      if (bounds.min.y < minimumHeight) {
        const liftAmount = minimumHeight - bounds.min.y;
        const worldCenter = bounds.getCenter(new THREE.Vector3());
        const parent = object.parent;

        const localStart = parent.worldToLocal(worldCenter.clone());

        const localEnd = parent.worldToLocal(
          worldCenter.clone().add(
            worldUp.clone().multiplyScalar(liftAmount)
          )
        );

        object.position.add(localEnd.sub(localStart));

        liftedComponents.push({
          component: object.name,
          lift: Number(liftAmount.toFixed(4))
        });
      }
    }

    root.updateWorldMatrix(true, true);

    console.log(
      `[A320] Components lifted above grid: ${liftedComponents.length}`
    );
    console.table(liftedComponents);

    const remainingBelowGrid = plan
      .map(record => {
        const bounds = new THREE.Box3().setFromObject(record.object);

        return {
          component: record.object.name,
          lowestWorldY: Number(bounds.min.y.toFixed(4))
        };
      })
      .filter(record => record.lowestWorldY < minimumHeight - 0.001);

    console.log(
      `[A320] Components still below minimum height: ${remainingBelowGrid.length}`
    );
    console.table(remainingBelowGrid);

    exploded = true;

    return {
      success: true,
      layout: 'a320-complete-component-explosion',
      componentsSeparated: plan.length,
      geometryObjectsMoved: movements.length,
      ...getStatus()
    };
  }


  function explodeMANTGX() {
    const plan = getMANTGXExplosionPlan(root);

    if (plan.length === 0) {
      return {
        success: false,
        reason: 'No MAN TGX component groups were found.',
        ...getStatus()
      };
    }

    selectedParts = [
      ...new Set(plan.flatMap(record => record.renderables))
    ];

    activeMANGroups = [];
    const movements = [];

    for (const record of plan) {
      if (!record.object.parent) continue;

      activeMANGroups.push(record.object);

      applyWorldOffset(record.object, record.offset, movements);
    }

    for (const movement of movements) {
      movement.object.position.copy(movement.position);
    }

    root.updateWorldMatrix(true, true);

    // MAN-only floor correction.
    const minimumHeight = 0.08;
    const worldUp = new THREE.Vector3(0, 1, 0);
    let liftedComponents = 0;

    for (const record of plan) {
      const object = record.object;
      if (!object.parent) continue;

      const bounds = new THREE.Box3().setFromObject(object);

      if (bounds.min.y < minimumHeight) {
        const liftAmount = minimumHeight - bounds.min.y;
        const worldCenter = bounds.getCenter(new THREE.Vector3());
        const parent = object.parent;

        const localStart = parent.worldToLocal(worldCenter.clone());
        const localEnd = parent.worldToLocal(
          worldCenter.clone().add(
            worldUp.clone().multiplyScalar(liftAmount)
          )
        );

        object.position.add(localEnd.sub(localStart));
        liftedComponents++;
      }
    }

    root.updateWorldMatrix(true, true);

    const remainingBelowGrid = plan.filter(record =>
      new THREE.Box3().setFromObject(record.object).min.y <
      minimumHeight - 0.001
    );

    console.log('[MAN TGX] Floor correction:', {
      liftedComponents,
      componentsStillBelowGrid: remainingBelowGrid.length
    });

    exploded = true;

    return {
      success: true,
      layout: 'man-tgx-complete-component-explosion',
      componentsSeparated: plan.length,
      geometryObjectsMoved: movements.length,
      liftedComponents,
      ...getStatus()
    };
  }


  function explodeSukhoiSU57() {
    const plan = getSukhoiSU57ExplosionPlan(root);

    if (plan.length !== 8) {
      return {
        success: false,
        reason: `Expected 8 Su-57 component groups, found ${plan.length}.`,
        ...getStatus()
      };
    }

    selectedParts = [
      ...new Set(plan.flatMap(record => record.renderables))
    ];

    activeSukhoiGroups = [];
    const movements = [];

    for (const record of plan) {
      if (!record.object.parent) continue;

      activeSukhoiGroups.push(record.object);
      applyWorldOffset(record.object, record.offset, movements);
    }

    for (const movement of movements) {
      movement.object.position.copy(movement.position);
    }

    root.updateWorldMatrix(true, true);
    exploded = true;

    console.log('[Su-57] Explosion completed:', {
      componentsSeparated: activeSukhoiGroups.length,
      geometryObjectsMoved: movements.length
    });

    return {
      success: true,
      layout: 'sukhoi-su57-eight-component-explosion',
      componentsSeparated: activeSukhoiGroups.length,
      geometryObjectsMoved: movements.length,
      ...getStatus()
    };
  }


  function explodeHondaCBR650R() {
    const plan = getHondaCBR650RExplosionPlan(root);

    if (plan.length !== 19) {
      return {
        success: false,
        reason: `Expected 19 Honda component groups, found ${plan.length}.`,
        ...getStatus()
      };
    }

    activeHondaGroups = [];
    selectedParts = [];

    const movements = [];

    for (const record of plan) {
      for (const object of record.objects) {
        if (!object.parent) continue;

        activeHondaGroups.push(object);
        selectedParts.push(object);

        applyWorldOffset(object, record.offset, movements);
      }
    }

    for (const movement of movements) {
      movement.object.position.copy(movement.position);
    }

    root.updateWorldMatrix(true, true);
    exploded = true;

    console.log('[Honda CBR650R] Explosion completed:', {
      componentsSeparated: plan.length,
      objectsMoved: activeHondaGroups.length,
      geometryObjectsMoved: movements.length
    });

    return {
      success: true,
      layout: 'honda-cbr650r-rigged-component-explosion',
      componentsSeparated: plan.length,
      objectsMoved: activeHondaGroups.length,
      geometryObjectsMoved: movements.length,
      ...getStatus()
    };
  }

  function explodeImmediately() {
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

    if (isHelicopter) {
      return explodeHelicopter();
    }

    if (vehicleId === 'bmw-s1000rr') {
      return explodeBMWS1000RR();
    }

    if (vehicleId === 'airbus-a320') {
      return explodeA320();
    }

    if (vehicleId === 'man-tgx') {
      return explodeMANTGX();
    }

    if (vehicleId === 'sukhoi-su57') {
      return explodeSukhoiSU57();
    }

    if (vehicleId === 'honda-cbr650r') {
      return explodeHondaCBR650R();
    }

    return explodeStandardVehicle();
  }

  function assembleImmediately() {
    if (!exploded) {
      return {
        success: true,
        alreadyAssembled: true,
        ...getStatus()
      };
    }

    const objectsToRestore =
      vehicleId === 'bmw-s1000rr'
        ? activeBMWGroups
        : vehicleId === 'airbus-a320'
        ? activeA320Groups
        : vehicleId === 'man-tgx'
          ? activeMANGroups
          : vehicleId === 'sukhoi-su57'
            ? activeSukhoiGroups
            : vehicleId === 'honda-cbr650r'
              ? activeHondaGroups
              : selectedParts;

    for (const object of objectsToRestore) {
      const originalPosition =
        object.userData[ORIGINAL_POSITION_KEY];

      if (originalPosition) {
        object.position.copy(originalPosition);

        delete object.userData[ORIGINAL_POSITION_KEY];
      }
    }

    root.updateWorldMatrix(true, true);

    exploded = false;
    selectedParts = [];
    activeHelicopterRecords = [];
    activeA320Groups = [];
    activeSukhoiGroups = [];
    activeHondaGroups = [];
    activeBMWGroups = [];

    if (vehicleId === 'bmw-s1000rr') {
      root.traverse(object => {
        if (object.isSkinnedMesh && object.skeleton) {
          object.skeleton.update();
        }
      });
    }

    return {
      success: true,
      ...getStatus()
    };
  }


  function runAnimatedTransition(operation) {
    cancelPositionAnimation();

    const startSnapshot = captureObjectPositions();
    const result = operation();

    if (
      !result ||
      !result.success ||
      result.alreadyExploded ||
      result.alreadyAssembled
    ) {
      return result;
    }

    const endSnapshot = captureObjectPositions();

    animatePositionChanges(startSnapshot, endSnapshot);

    return result;
  }

  function explode() {
    return runAnimatedTransition(explodeImmediately);
  }

  function assemble() {
    return runAnimatedTransition(assembleImmediately);
  }

  function dispose() {
    cancelPositionAnimation();
    if (exploded) {
      assembleImmediately();
    }

    selectedParts = [];
    activeHelicopterRecords = [];
    activeA320Groups = [];
    activeSukhoiGroups = [];
    activeHondaGroups = [];
    activeBMWGroups = [];
  }

  return {
    explode,
    assemble,
    dispose,
    getStatus,
    getAvailableParts
  };
}
