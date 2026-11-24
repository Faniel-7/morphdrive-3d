import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { VEHICLE_CATALOG } from '../src/showroom/vehicle-catalog.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const keywords = [
  'steer', 'wheel', 'dashboard', 'dash', 'cockpit',
  'windshield', 'windscreen', 'seat', 'pilot', 'driver',
  'glass', 'canopy', 'instrument', 'handlebar', 'handle',
  'rudder', 'control', 'panel', 'console', 'cabin',
  'front', 'visor'
];

function readGLB(file) {
  const buffer = fs.readFileSync(file);

  if (buffer.toString('ascii', 0, 4) !== 'glTF') {
    throw new Error('Invalid GLB file.');
  }

  const declaredLength = buffer.readUInt32LE(8);
  let offset = 12;
  let json = null;

  while (offset < declaredLength) {
    const length = buffer.readUInt32LE(offset);
    const type = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;

    if (type === 0x4E4F534A) {
      json = JSON.parse(
        buffer.toString('utf8', start, start + length)
          .replace(/\0+$/, '').trim()
      );
    }

    offset = start + length;
  }

  if (!json) throw new Error('GLB JSON chunk not found.');
  return json;
}

function localMatrix(node) {
  if (node.matrix) {
    return new THREE.Matrix4().fromArray(node.matrix);
  }

  const position = new THREE.Vector3(...(node.translation || [0, 0, 0]));
  const rotation = new THREE.Quaternion(...(node.rotation || [0, 0, 0, 1]));
  const scale = new THREE.Vector3(...(node.scale || [1, 1, 1]));

  return new THREE.Matrix4().compose(position, rotation, scale);
}

function inspectModel(model) {
  const relative = model.url.replace(/^\/+/, '');
  const file = path.join(root, 'frontend', 'public', relative);
  const gltf = readGLB(file);

  const nodes = gltf.nodes || [];
  const meshes = gltf.meshes || [];
  const accessors = gltf.accessors || [];
  const scene = gltf.scenes?.[gltf.scene || 0];

  const records = [];
  const totalBounds = new THREE.Box3();

  function visit(index, parentMatrix, parents = [], depth = 0) {
    const node = nodes[index];
    if (!node) return new THREE.Box3();

    const world = parentMatrix.clone().multiply(localMatrix(node));
    const name = node.name || `Node_${index}`;
    const hierarchy = [...parents, name];
    const bounds = new THREE.Box3();

    if (node.mesh !== undefined) {
      const mesh = meshes[node.mesh];

      for (const primitive of mesh?.primitives || []) {
        const accessor = accessors[primitive.attributes?.POSITION];

        if (!accessor?.min || !accessor?.max) continue;

        const min = accessor.min;
        const max = accessor.max;

        for (let x = 0; x < 2; x++) {
          for (let y = 0; y < 2; y++) {
            for (let z = 0; z < 2; z++) {
              const point = new THREE.Vector3(
                x ? max[0] : min[0],
                y ? max[1] : min[1],
                z ? max[2] : min[2]
              ).applyMatrix4(world);

              bounds.expandByPoint(point);
            }
          }
        }
      }
    }

    for (const child of node.children || []) {
      bounds.union(visit(child, world, hierarchy, depth + 1));
    }

    if (!bounds.isEmpty()) {
      records.push({
        name,
        hierarchy: hierarchy.join(' / '),
        depth,
        bounds: bounds.clone()
      });
    }

    return bounds;
  }

  const identity = new THREE.Matrix4();

  for (const index of scene?.nodes || []) {
    totalBounds.union(visit(index, identity));
  }

  if (totalBounds.isEmpty()) {
    throw new Error('Could not calculate model bounds.');
  }

  const modelSize = new THREE.Vector3();
  const modelCenter = new THREE.Vector3();

  totalBounds.getSize(modelSize);
  totalBounds.getCenter(modelCenter);

  const scale = 5 / Math.max(modelSize.x, modelSize.y, modelSize.z);
  const matches = records.filter(record =>
    keywords.some(keyword => record.name.toLowerCase().includes(keyword))
  );

  const lines = [
    `${model.name} (${model.id})`,
    `Model dimensions: X=${modelSize.x.toFixed(4)}, Y=${modelSize.y.toFixed(4)}, Z=${modelSize.z.toFixed(4)}`,
    `Normalization scale: ${scale.toFixed(6)}`,
    `Matching components: ${matches.length}`
  ];

  for (const record of matches) {
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();

    record.bounds.getCenter(center);
    record.bounds.getSize(size);

    center.x = (center.x - modelCenter.x) * scale;
    center.y = (center.y - totalBounds.min.y) * scale;
    center.z = (center.z - modelCenter.z) * scale;
    size.multiplyScalar(scale);

    lines.push(
      `  ${record.name}`,
      `    Center: x=${center.x.toFixed(3)}, y=${center.y.toFixed(3)}, z=${center.z.toFixed(3)}`,
      `    Size:   x=${size.x.toFixed(3)}, y=${size.y.toFixed(3)}, z=${size.z.toFixed(3)}`,
      `    Path: ${record.hierarchy}`
    );
  }

  return lines;
}

const output = [
  'MORPHDRIVE 3D — COCKPIT GEOMETRY REPORT',
  '=======================================',
  'Coordinates are calculated from GLB geometry and hierarchy transforms.',
  'Positions are normalized to the same 5-unit model scale used by the viewer.',
  ''
];

for (const model of VEHICLE_CATALOG) {
  console.log(`Inspecting ${model.name}...`);

  try {
    output.push(...inspectModel(model), '');
  } catch (error) {
    output.push(
      `${model.name} (${model.id})`,
      `ERROR: ${error.message}`,
      ''
    );
  }
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const report = path.join(
  root,
  'docs',
  'reports',
  `cockpit-geometry-world-bounds-${stamp}.txt`
);

fs.mkdirSync(path.dirname(report), { recursive: true });
fs.writeFileSync(report, output.join('\n'));

console.log('\nInspection complete.');
console.log(`Report: ${report}`);
