import fs from 'node:fs';

const modelPath = 'public/models/sedan.glb';
const outputPath = '../docs/reports/sedan-cockpit-inspection.txt';

if (!fs.existsSync(modelPath)) {
  console.error(`Model not found: ${modelPath}`);
  process.exit(1);
}

const buffer = fs.readFileSync(modelPath);

const magic = buffer.toString('ascii', 0, 4);
const version = buffer.readUInt32LE(4);
const declaredLength = buffer.readUInt32LE(8);

if (magic !== 'glTF' || version !== 2) {
  throw new Error('Invalid or unsupported GLB 2.0 file.');
}

let offset = 12;
let gltf = null;
let binaryChunk = null;

while (offset < declaredLength) {
  const chunkLength = buffer.readUInt32LE(offset);
  const chunkType = buffer.readUInt32LE(offset + 4);
  const chunkStart = offset + 8;

  if (chunkType === 0x4E4F534A) {
    gltf = JSON.parse(
      buffer.toString('utf8', chunkStart, chunkStart + chunkLength)
        .replace(/\0+$/, '')
        .trim()
    );
  }

  if (chunkType === 0x004E4942) {
    binaryChunk = buffer.subarray(
      chunkStart,
      chunkStart + chunkLength
    );
  }

  offset = chunkStart + chunkLength;
}

if (!gltf) {
  throw new Error('Could not find the GLB JSON chunk.');
}

const nodes = gltf.nodes || [];
const meshes = gltf.meshes || [];
const accessors = gltf.accessors || [];
const scenes = gltf.scenes || [];
const materials = gltf.materials || [];

function getAccessorBounds(accessorIndex) {
  const accessor = accessors[accessorIndex];

  if (!accessor) return null;

  return {
    min: accessor.min || null,
    max: accessor.max || null,
    count: accessor.count,
    type: accessor.type,
    componentType: accessor.componentType
  };
}

const records = [];

function visitNode(nodeIndex, parentPath = [], depth = 0) {
  const node = nodes[nodeIndex];
  if (!node) return;

  const path = [...parentPath, node.name || `Node_${nodeIndex}`];

  const mesh = node.mesh !== undefined
    ? meshes[node.mesh]
    : null;

  if (mesh) {
    const primitives = (mesh.primitives || []).map((primitive, index) => {
      const positionAccessor = primitive.attributes?.POSITION;
      const bounds = positionAccessor !== undefined
        ? getAccessorBounds(positionAccessor)
        : null;

      const material = primitive.material !== undefined
        ? materials[primitive.material]
        : null;

      const indexAccessor = primitive.indices !== undefined
        ? accessors[primitive.indices]
        : null;

      const triangles = indexAccessor
        ? Math.floor(indexAccessor.count / 3)
        : bounds?.count
          ? Math.floor(bounds.count / 3)
          : 0;

      return {
        primitive: index,
        bounds,
        triangles,
        material: material?.name || '(unnamed/default)',
        mode: primitive.mode ?? 4
      };
    });

    records.push({
      nodeIndex,
      name: node.name || `Node_${nodeIndex}`,
      path: path.join(' / '),
      depth,
      mesh: mesh.name || `Mesh_${node.mesh}`,
      translation: node.translation || [0, 0, 0],
      rotation: node.rotation || [0, 0, 0, 1],
      scale: node.scale || [1, 1, 1],
      children: node.children || [],
      primitives
    });
  }

  for (const childIndex of node.children || []) {
    visitNode(childIndex, path, depth + 1);
  }
}

for (const scene of scenes) {
  for (const rootIndex of scene.nodes || []) {
    visitNode(rootIndex);
  }
}

const lines = [
  'MORPHDRIVE 3D — SEDAN MODEL INSPECTION',
  '========================================',
  `File: ${modelPath}`,
  `GLB version: ${version}`,
  `File size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`,
  '',
  'MODEL STRUCTURE',
  `Nodes: ${nodes.length}`,
  `Meshes: ${meshes.length}`,
  `Materials: ${materials.length}`,
  `Accessors: ${accessors.length}`,
  `Textures: ${(gltf.textures || []).length}`,
  `Images: ${(gltf.images || []).length}`,
  `Scenes: ${scenes.length}`,
  '',
  'NODE AND MESH DETAILS',
  '---------------------'
];

for (const record of records) {
  lines.push(
    '',
    `${record.name} [Node ${record.nodeIndex}]`,
    `  Hierarchy: ${record.path}`,
    `  Mesh: ${record.mesh}`,
    `  Depth: ${record.depth}`,
    `  Translation: ${record.translation.join(', ')}`,
    `  Rotation (quaternion): ${record.rotation.join(', ')}`,
    `  Scale: ${record.scale.join(', ')}`
  );

  for (const primitive of record.primitives) {
    lines.push(
      `  Primitive ${primitive.primitive}:`,
      `    Material: ${primitive.material}`,
      `    Triangles: ${primitive.triangles}`,
      `    Mode: ${primitive.mode}`
    );

    if (primitive.bounds) {
      lines.push(
        `    Vertex count: ${primitive.bounds.count}`,
        `    Local minimum: ${primitive.bounds.min?.join(', ') ?? 'Unavailable'}`,
        `    Local maximum: ${primitive.bounds.max?.join(', ') ?? 'Unavailable'}`
      );
    }
  }
}

lines.push(
  '',
  'IMPORTANT',
  '--------',
  'Accessor bounds are local geometry bounds, not final world-space bounds.',
  'Node transforms must be applied to calculate final world positions.',
  'Embedded textures were not decoded or modified.'
);

const report = lines.join('\n');

fs.mkdirSync('../docs/reports', { recursive: true });
fs.writeFileSync(outputPath, report);

console.log(report);
console.log(`\nReport saved to ${outputPath}`);
