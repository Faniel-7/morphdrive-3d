/**
 * MorphDrive 3D — Shared First-Person Vehicle Camera
 *
 * Supports all 16 vehicles through one controller and individual
 * vehicle profiles. Uses named cockpit geometry when available,
 * with a bounds-based fallback for incomplete GLB models.
 */

const VEHICLE_COCKPIT_CONFIG = {
  // Cars
  sedan: {
    axis: 'z', forward: 1, driverSide: -1,
    fallbackFromFront: 0.39, eyeHeight: 0.69, lookAhead: 0.22
  },
  'urus-performante': {
    axis: 'z', forward: 1, driverSide: -1,
    fallbackFromFront: 0.39, eyeHeight: 0.68, lookAhead: 0.22
  },
  'ford-f150-raptor': {
    axis: 'z', forward: 1, driverSide: -1,
    fallbackFromFront: 0.39, eyeHeight: 0.68, lookAhead: 0.22
  },
  'lamborghini-centenario': {
    axis: 'z', forward: 1, driverSide: -1,
    fallbackFromFront: 0.39, eyeHeight: 0.69, lookAhead: 0.22
  },
  'polestar-3': {
    axis: 'z', forward: -1, driverSide: -1,
    fallbackFromFront: 0.39, eyeHeight: 0.68, lookAhead: 0.22
  },
  'skoda-elroq': {
    axis: 'x', forward: -1, driverSide: -1,
    fallbackFromFront: 0.39, eyeHeight: 0.68, lookAhead: 0.22
  },

  // Motorcycles
  'bmw-s1000rr': {
    axis: 'z', forward: -1, driverSide: 0,
    fallbackFromFront: 0.43, eyeHeight: 0.78, lookAhead: 0.20
  },
  'honda-cbr650r': {
    axis: 'z', forward: -1, driverSide: 0,
    fallbackFromFront: 0.43, eyeHeight: 0.77, lookAhead: 0.20
  },
  'kawasaki-ninja-h2': {
    axis: 'x', forward: -1, driverSide: 0,
    fallbackFromFront: 0.43, eyeHeight: 0.77, lookAhead: 0.20
  },
  'sports-bike': {
    axis: 'z', forward: 1, driverSide: 0,
    fallbackFromFront: 0.43, eyeHeight: 0.76, lookAhead: 0.20
  },

  // Aircraft
  'airbus-a320': {
    axis: 'z', forward: -1, driverSide: -1,
    fallbackFromFront: 0.29, eyeHeight: 0.65, lookAhead: 0.25
  },
  'boeing-787': {
    axis: 'x', forward: -1, driverSide: -1,
    fallbackFromFront: 0.29, eyeHeight: 0.65, lookAhead: 0.25
  },
  'sukhoi-su57': {
    axis: 'x', forward: 1, driverSide: 0,
    fallbackFromFront: 0.35, eyeHeight: 0.67, lookAhead: 0.23
  },

  // Helicopters
  'apache-ah64e': {
    axis: 'z', forward: 1, driverSide: -1,
    fallbackFromFront: 0.37, eyeHeight: 0.66, lookAhead: 0.22
  },
  'realistic-helicopter': {
    axis: 'z', forward: 1, driverSide: 0,
    fallbackFromFront: 0.55, eyeHeight: 0.67, lookAhead: 0.20
  },

  // Truck
  'man-tgx': {
    axis: 'z', forward: -1, driverSide: -1,
    fallbackFromFront: 0.39, eyeHeight: 0.68, lookAhead: 0.22
  }
};

const DEFAULT_CONFIG = {
  axis: 'z',
  forward: -1,
  driverSide: 0,
  fallbackFromFront: 0.4,
  eyeHeight: 0.67,
  lookAhead: 0.2
};

const SEAT_PATTERNS = [
  /driver.?seat/i,
  /pilot.?seat/i,
  /rider.?seat/i,
  /front.?seat/i,
  /seat/i,
  /saddle/i,
  /captain/i
];

const TARGET_PATTERNS = [
  /dashboard/i,
  /instrument.?panel/i,
  /instrument.?cluster/i,
  /cockpit.?panel/i,
  /control.?panel/i,
  /handlebar/i,
  /steering.?wheel/i,
  /windscreen/i,
  /windshield/i,
  /canopy/i,
  /cockpit.?glass/i
];

function getObjectPath(object) {
  const names = [];
  let current = object;

  while (current) {
    if (current.name) names.push(current.name);
    current = current.parent;
  }

  return names.join(' / ');
}

function getPatternScore(name, patterns) {
  for (let index = 0; index < patterns.length; index++) {
    if (patterns[index].test(name)) {
      return patterns.length - index;
    }
  }

  return 0;
}

function findBestComponent(components, patterns) {
  let best = null;
  let bestScore = 0;

  for (const component of components) {
    const score = getPatternScore(component.name, patterns);

    if (score > bestScore) {
      best = component;
      bestScore = score;
    }
  }

  return best;
}

export function createCockpitCamera({ THREE, camera, controls }) {
  if (!THREE || !camera || !controls) {
    throw new Error(
      'Cockpit camera requires THREE, camera, and OrbitControls.'
    );
  }

  const cameraPosition = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  const tempSize = new THREE.Vector3();

  function collectComponents(vehicle) {
    const components = [];

    vehicle.updateMatrixWorld(true);

    vehicle.traverse(object => {
      if (!object.isMesh || !object.geometry) return;

      const name = getObjectPath(object);

      if (
        !/(seat|saddle|dashboard|instrument|panel|handlebar|steering|windshield|windscreen|canopy|cockpit|control)/i.test(name)
      ) {
        return;
      }

      const bounds = new THREE.Box3().setFromObject(object);

      if (bounds.isEmpty()) return;

      const componentCenter = bounds.getCenter(new THREE.Vector3());
      const componentSize = bounds.getSize(new THREE.Vector3());

      components.push({
        object,
        name,
        center: componentCenter,
        size: componentSize
      });
    });

    return components;
  }

  function calculateFallback(vehicle, config, bounds) {
    bounds.getCenter(center);
    bounds.getSize(size);

    const axis = config.axis;
    const lateralAxis = axis === 'x' ? 'z' : 'x';
    const length = Math.max(size[axis], 0.1);
    const height = Math.max(size.y, 0.1);
    const width = Math.max(size[lateralAxis], 0.1);

    const frontCoordinate =
      center[axis] + config.forward * length * 0.5;

    const longitudinalPosition =
      frontCoordinate -
      config.forward * length * config.fallbackFromFront;

    cameraPosition.copy(center);
    cameraPosition[axis] = longitudinalPosition;
    cameraPosition.y =
      bounds.min.y + height * config.eyeHeight;

    cameraPosition[lateralAxis] =
      center[lateralAxis] +
      width * config.driverSide * 0.12;

    lookTarget.copy(cameraPosition);
    lookTarget[axis] +=
      config.forward * length * config.lookAhead;

    return {
      method: 'bounds-fallback',
      seat: null,
      target: null
    };
  }

  function calculateFromComponents(
    config,
    components,
    bounds
  ) {
    const seat = findBestComponent(
      components,
      SEAT_PATTERNS
    );

    const target = findBestComponent(
      components,
      TARGET_PATTERNS
    );

    if (!seat) {
      return null;
    }

    bounds.getSize(size);

    const vehicleHeight = Math.max(size.y, 0.1);
    const lateralAxis = config.axis === 'x' ? 'z' : 'x';

    // Raise the camera above the seat surface to approximate
    // the driver's, rider's, or pilot's eye position.
    cameraPosition.copy(seat.center);
    cameraPosition.y += Math.max(
      seat.size.y * 0.65,
      vehicleHeight * 0.10
    );

    // Apply a small driver-side offset for vehicles with
    // a left/right seating position.
    if (config.driverSide !== 0) {
      cameraPosition[lateralAxis] +=
        Math.max(size[lateralAxis], 0.1) *
        config.driverSide *
        0.055;
    }

    if (target) {
      lookTarget.copy(target.center);

      // Keep the target slightly above the component center.
      lookTarget.y += target.size.y * 0.12;
    } else {
      lookTarget.copy(cameraPosition);
      lookTarget[config.axis] +=
        config.forward * Math.max(size[config.axis], 0.1) * 0.20;
    }

    // If a detected target is behind the seat, use a forward
    // fallback target instead of looking toward the rear.
    const forwardDistance =
      (lookTarget[config.axis] - cameraPosition[config.axis]) *
      config.forward;

    if (forwardDistance < 0.02) {
      lookTarget.copy(cameraPosition);
      lookTarget[config.axis] +=
        config.forward * Math.max(size[config.axis], 0.1) * 0.20;
    }

    return {
      method: 'named-components',
      seat: seat.name,
      target: target ? target.name : null
    };
  }

  function enter(vehicle, vehicleId) {
    if (!vehicle) {
      console.warn('MorphDrive cockpit: no vehicle is loaded.');
      return false;
    }

    const config =
      VEHICLE_COCKPIT_CONFIG[vehicleId] || DEFAULT_CONFIG;

    vehicle.updateMatrixWorld(true);

    const bounds = new THREE.Box3().setFromObject(vehicle);

    if (bounds.isEmpty()) {
      console.warn('MorphDrive cockpit: vehicle bounds are empty.');
      return false;
    }

    const components = collectComponents(vehicle);

    const componentResult = calculateFromComponents(
      config,
      components,
      bounds
    );

    const result =
      componentResult ||
      calculateFallback(vehicle, config, bounds);

    controls.autoRotate = false;
    controls.minDistance = 0.025;

    bounds.getSize(tempSize);
    controls.maxDistance = Math.max(18, tempSize.length() * 5);

    controls.target.copy(lookTarget);
    camera.position.copy(cameraPosition);
    camera.lookAt(lookTarget);

    controls.update();

    console.info('MorphDrive: cockpit camera entered.', {
      vehicleId,
      method: result.method,
      seat: result.seat,
      target: result.target,
      axis: config.axis,
      forward: config.forward,
      cameraPosition: cameraPosition.toArray(),
      lookTarget: lookTarget.toArray()
    });

    return true;
  }

  return {
    enter,

    getSupportedVehicles() {
      return Object.keys(VEHICLE_COCKPIT_CONFIG);
    }
  };
}
