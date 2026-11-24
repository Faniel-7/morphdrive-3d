import fs from 'node:fs';

const input = 'docs/reports/vehicle-model-inventory.json';
const output = 'docs/reports/vehicle-cockpit-candidates.txt';

const inventory = JSON.parse(fs.readFileSync(input, 'utf8'));

const targetSize = 5;

const keywords = [
  'seat', 'cockpit', 'interior', 'dashboard',
  'steering', 'pilot', 'cabin', 'chair',
  'windshield', 'windscreen', 'canopy',
  'instrument', 'control', 'console',
  'handlebar', 'saddle', 'rider',
  'flightdeck', 'flight-deck', 'helm',
  'joystick', 'pedal', 'throttle'
];

function multiplyQuaternion(a, b) {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
  ];
}

function rotateVector(v, q) {
  const [x, y, z, w] = q;

  const tx = 2 * (y * v[2] - z * v[1]);
  const ty = 2 * (z * v[0] - x * v[2]);
  const tz = 2 * (x * v[1] - y * v[0]);

  return [
    v[0] + w * tx + (y * tz - z * ty),
    v[1] + w * ty + (z * tx - x * tz),
    v[2] + w * tz + (x * ty - y * tx)
  ];
}

function worldTransform(record, byPath, cache) {
  if (cache.has(record.hierarchy)) {
    return cache.get(record.hierarchy);
  }

  const parentPath = record.hierarchy.includes(' / ')
    ? record.hierarchy.substring(
        0,
        record.hierarchy.lastIndexOf(' / ')
      )
    : null;

  const parent = parentPath ? byPath.get(parentPath) : null;

  const localPosition = record.translation || [0, 0, 0];
  const localRotation = record.rotation || [0, 0, 0, 1];
  const localScale = record.scale || [1, 1, 1];

  let result;

  if (!parent) {
    result = {
      position: [...localPosition],
      rotation: [...localRotation],
      scale: [...localScale]
    };
  } else {
    const p = worldTransform(parent, byPath, cache);

    const scaled = localPosition.map(
      (value, i) => value * p.scale[i]
    );

    const rotated = rotateVector(scaled, p.rotation);

    result = {
      position: p.position.map(
        (value, i) => value + rotated[i]
      ),
      rotation: multiplyQuaternion(p.rotation, localRotation),
      scale: p.scale.map(
        (value, i) => value * localScale[i]
      )
    };
  }

  cache.set(record.hierarchy, result);
  return result;
}

function worldBounds(record, transform) {
  const mins = [Infinity, Infinity, Infinity];
  const maxs = [-Infinity, -Infinity, -Infinity];

  let found = false;

  for (const primitive of record.primitives || []) {
    const bounds = primitive.localBounds;

    if (!bounds?.min || !bounds?.max) continue;

    found = true;

    for (let mask = 0; mask < 8; mask++) {
      const local = [0, 1, 2].map(axis =>
        (mask & (1 << axis))
          ? bounds.max[axis]
          : bounds.min[axis]
      );

      const scaled = local.map(
        (value, i) => value * transform.scale[i]
      );

      const rotated = rotateVector(
        scaled,
        transform.rotation
      );

      const point = rotated.map(
        (value, i) => value + transform.position[i]
      );

      for (let axis = 0; axis < 3; axis++) {
        mins[axis] = Math.min(mins[axis], point[axis]);
        maxs[axis] = Math.max(maxs[axis], point[axis]);
      }
    }
  }

  if (!found) return null;

  return {
    min: mins,
    max: maxs,
    center: mins.map(
      (value, i) => (value + maxs[i]) / 2
    )
  };
}

function mergeBounds(target, bounds) {
  if (!bounds) return;

  for (let axis = 0; axis < 3; axis++) {
    target.min[axis] = Math.min(
      target.min[axis],
      bounds.min[axis]
    );

    target.max[axis] = Math.max(
      target.max[axis],
      bounds.max[axis]
    );
  }
}

function finishBounds(bounds) {
  if (!Number.isFinite(bounds.min[0])) return null;

  bounds.center = bounds.min.map(
    (value, i) => (value + bounds.max[i]) / 2
  );

  bounds.size = bounds.min.map(
    (value, i) => bounds.max[i] - value
  );

  return bounds;
}

// Reproduces the wrapper transformation in vehicle-manager.js.
function normalizeBounds(bounds, normalization) {
  if (!bounds) return null;

  const min = [];
  const max = [];

  for (let axis = 0; axis < 3; axis++) {
    min[axis] =
      bounds.min[axis] * normalization.scale +
      normalization.position[axis];

    max[axis] =
      bounds.max[axis] * normalization.scale +
      normalization.position[axis];
  }

  return {
    min,
    max,
    center: min.map(
      (value, i) => (value + max[i]) / 2
    ),
    size: min.map(
      (value, i) => max[i] - value
    )
  };
}

function matchesKeywords(value) {
  const normalized = String(value || '').toLowerCase();

  return keywords.filter(keyword =>
    normalized.includes(keyword)
  );
}

function formatVector(vector) {
  return vector
    ? vector.map(value => value.toFixed(3)).join(', ')
    : 'Unavailable';
}

const lines = [
  'MORPHDRIVE 3D — NORMALIZED COCKPIT / INTERIOR CANDIDATES',
  '========================================================',
  'Normalized coordinates reproduce vehicle-manager.js wrapper normalization.',
  'Largest vehicle dimension is normalized to 5 Three.js units.',
  'Candidate positions are approximate bounds centers, NOT verified camera positions.',
  'Direct, ancestor and material matches are reported separately.',
  ''
];

let successfulVehicles = 0;
let failedVehicles = 0;
let totalCandidates = 0;

for (const vehicle of inventory.vehicles) {
  lines.push(
    '',
    `VEHICLE: ${vehicle.name} (${vehicle.id})`,
    `Type: ${vehicle.type}`,
    `Status: ${vehicle.status}`,
    '----------------------------------------'
  );

  if (vehicle.status !== 'success') {
    failedVehicles++;
    lines.push(`Inspection unavailable: ${vehicle.error || 'Unknown error'}`);
    continue;
  }

  successfulVehicles++;

  const byPath = new Map(
    vehicle.nodes.map(node => [node.hierarchy, node])
  );

  const cache = new Map();

  // Calculate complete original vehicle bounds.
  const vehicleBounds = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity]
  };

  const originalNodeBounds = new Map();

  for (const node of vehicle.nodes) {
    if (!node.primitives?.length) continue;

    const transform = worldTransform(node, byPath, cache);
    const bounds = worldBounds(node, transform);

    if (!bounds) continue;

    originalNodeBounds.set(node.hierarchy, bounds);
    mergeBounds(vehicleBounds, bounds);
  }

  const completeBounds = finishBounds(vehicleBounds);

  if (!completeBounds) {
    lines.push('Could not calculate complete vehicle bounds.');
    continue;
  }

  const largestDimension = Math.max(...completeBounds.size);

  if (!Number.isFinite(largestDimension) || largestDimension <= 0) {
    lines.push('Invalid vehicle dimensions.');
    continue;
  }

  const scale = targetSize / largestDimension;

  const normalization = {
    scale,
    position: [
      -completeBounds.center[0] * scale,
      -completeBounds.min[1] * scale,
      -completeBounds.center[2] * scale
    ]
  };

  const normalizedVehicleBounds = normalizeBounds(
    completeBounds,
    normalization
  );

  lines.push(
    `Original dimensions: ${formatVector(completeBounds.size)}`,
    `Original center: ${formatVector(completeBounds.center)}`,
    `Normalization scale: ${scale.toFixed(6)}`,
    `Normalized dimensions: ${formatVector(normalizedVehicleBounds.size)}`,
    `Normalized vehicle center: ${formatVector(normalizedVehicleBounds.center)}`,
    `Normalized vehicle minimum: ${formatVector(normalizedVehicleBounds.min)}`,
    `Normalized vehicle maximum: ${formatVector(normalizedVehicleBounds.max)}`
  );

  const candidates = [];

  for (const node of vehicle.nodes) {
    if (!node.primitives?.length) continue;

    const directText = `${node.name || ''} ${node.meshName || ''}`;
    const directMatches = matchesKeywords(directText);

    const hierarchyParts = String(node.hierarchy || '')
      .split(' / ')
      .filter(Boolean);

    const ancestorText = hierarchyParts
      .slice(0, -1)
      .join(' ');

    const ancestorMatches = matchesKeywords(ancestorText);

    const materialNames = [
      ...new Set(
        node.primitives
          .map(primitive => primitive.materialName)
          .filter(Boolean)
      )
    ];

    const materialMatches = materialNames
      .map(name => ({
        name,
        keywords: matchesKeywords(name)
      }))
      .filter(item => item.keywords.length > 0);

    if (
      directMatches.length === 0 &&
      ancestorMatches.length === 0 &&
      materialMatches.length === 0
    ) {
      continue;
    }

    const originalBounds = originalNodeBounds.get(node.hierarchy);

    if (!originalBounds) continue;

    const normalizedBounds = normalizeBounds(
      originalBounds,
      normalization
    );

    const triangleCount = node.primitives.reduce(
      (sum, primitive) => sum + (primitive.triangleCount || 0),
      0
    );

    const classification = [];

    if (directMatches.length) classification.push('DIRECT');
    if (ancestorMatches.length) classification.push('ANCESTOR');
    if (materialMatches.length) classification.push('MATERIAL');

    candidates.push({
      node,
      classification,
      directMatches,
      ancestorMatches,
      materialMatches,
      originalBounds,
      normalizedBounds,
      triangleCount
    });
  }

  totalCandidates += candidates.length;

  lines.push(
    '',
    `Candidates found: ${candidates.length}`,
    'Match categories: DIRECT = node/mesh name; ANCESTOR = parent hierarchy; MATERIAL = material name.'
  );

  if (candidates.length === 0) {
    lines.push('No matching names or materials found.');
    continue;
  }

  for (const candidate of candidates) {
    const {
      node,
      classification,
      directMatches,
      ancestorMatches,
      materialMatches,
      originalBounds,
      normalizedBounds,
      triangleCount
    } = candidate;

    lines.push(
      '',
      `Name: ${node.name || '(unnamed)'}`,
      `Mesh: ${node.meshName || '(none)'}`,
      `Classification: ${classification.join(' + ')}`,
      `Direct matches: ${directMatches.join(', ') || 'None'}`,
      `Ancestor matches: ${ancestorMatches.join(', ') || 'None'}`,
      `Material matches: ${
        materialMatches.length
          ? materialMatches.map(item =>
              `${item.name} [${item.keywords.join(', ')}]`
            ).join('; ')
          : 'None'
      }`,
      `Triangles: ${triangleCount}`,
      `Original world center: ${formatVector(originalBounds.center)}`,
      `Normalized center: ${formatVector(normalizedBounds.center)}`,
      `Normalized min: ${formatVector(normalizedBounds.min)}`,
      `Normalized max: ${formatVector(normalizedBounds.max)}`,
      `Normalized size: ${formatVector(normalizedBounds.size)}`,
      `Hierarchy: ${node.hierarchy}`
    );
  }
}

lines.push(
  '',
  '========================================================',
  'SCAN SUMMARY',
  `Successful vehicles: ${successfulVehicles}`,
  `Failed vehicles: ${failedVehicles}`,
  `Total candidates: ${totalCandidates}`,
  `Target normalization size: ${targetSize}`
);

fs.writeFileSync(output, lines.join('\n'));

console.log(lines.join('\n'));
console.log(`\nSaved report: ${output}`);
