import fs from 'node:fs';
import path from 'node:path';
import { VEHICLE_CATALOG } from '../src/showroom/vehicle-catalog.js';

const outputDir = '../docs/reports';
const jsonPath = path.join(outputDir, 'vehicle-model-inventory.json');
const summaryPath = path.join(outputDir, 'vehicle-model-inventory.txt');

fs.mkdirSync(outputDir, { recursive: true });

function inspectGLB(modelPath) {
  const buffer = fs.readFileSync(modelPath);

  if (buffer.toString('ascii', 0, 4) !== 'glTF') {
    throw new Error('Invalid GLB file signature.');
  }

  const version = buffer.readUInt32LE(4);
  const declaredLength = buffer.readUInt32LE(8);

  if (version !== 2) {
    throw new Error(`Unsupported GLB version: ${version}`);
  }

  let offset = 12;
  let gltf = null;

  while (offset < declaredLength) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;

    if (chunkType === 0x4E4F534A) {
      gltf = JSON.parse(
        buffer.toString(
          'utf8',
          chunkStart,
          chunkStart + chunkLength
        ).replace(/\0+$/, '').trim()
      );
    }

    offset = chunkStart + chunkLength;
  }

  if (!gltf) throw new Error('Missing GLB JSON chunk.');

  const nodes = gltf.nodes || [];
  const meshes = gltf.meshes || [];
  const accessors = gltf.accessors || [];
  const materials = gltf.materials || [];
  const records = [];
  const visited = new Set();

  function visit(index, parentPath = [], depth = 0) {
    if (visited.has(index)) return;
    visited.add(index);

    const node = nodes[index];
    if (!node) return;

    const name = node.name || `Node_${index}`;
    const hierarchy = [...parentPath, name];

    const record = {
      nodeIndex: index,
      name,
      hierarchy: hierarchy.join(' / '),
      depth,
      meshIndex: node.mesh ?? null,
      translation: node.translation || [0, 0, 0],
      rotation: node.rotation || [0, 0, 0, 1],
      scale: node.scale || [1, 1, 1],
      meshName: null,
      primitives: []
    };

    if (node.mesh !== undefined) {
      const mesh = meshes[node.mesh];

      if (mesh) {
        record.meshName = mesh.name || `Mesh_${node.mesh}`;

        for (const [primitiveIndex, primitive] of
          (mesh.primitives || []).entries()) {

          const positionIndex = primitive.attributes?.POSITION;
          const position = positionIndex !== undefined
            ? accessors[positionIndex]
            : null;

          const indexAccessor = primitive.indices !== undefined
            ? accessors[primitive.indices]
            : null;

          const material = primitive.material !== undefined
            ? materials[primitive.material]
            : null;

          const vertexCount = position?.count || 0;

          record.primitives.push({
            primitiveIndex,
            materialIndex: primitive.material ?? null,
            materialName: material?.name || '(default/unnamed)',
            vertexCount,
            triangleCount: indexAccessor
              ? Math.floor(indexAccessor.count / 3)
              : Math.floor(vertexCount / 3),
            localBounds: {
              min: position?.min || null,
              max: position?.max || null
            }
          });
        }
      }
    }

    records.push(record);

    for (const child of node.children || []) {
      visit(child, hierarchy, depth + 1);
    }
  }

  const scene = gltf.scenes?.[gltf.scene || 0];

  for (const rootNode of scene?.nodes || []) {
    visit(rootNode);
  }

  const totalTriangles = records.reduce(
    (sum, record) => sum + record.primitives.reduce(
      (subtotal, primitive) => subtotal + primitive.triangleCount,
      0
    ),
    0
  );

  const totalVertices = records.reduce(
    (sum, record) => sum + record.primitives.reduce(
      (subtotal, primitive) => subtotal + primitive.vertexCount,
      0
    ),
    0
  );

  return {
    fileSizeBytes: buffer.length,
    glbVersion: version,
    sceneCount: (gltf.scenes || []).length,
    nodeCount: nodes.length,
    reachableNodeCount: records.length,
    meshCount: meshes.length,
    materialCount: materials.length,
    textureCount: (gltf.textures || []).length,
    imageCount: (gltf.images || []).length,
    accessorCount: accessors.length,
    totalTriangles,
    totalVertices,
    materials: materials.map((material, index) => ({
      index,
      name: material.name || `Material_${index}`
    })),
    nodes: records
  };
}

const inventory = {
  generatedAt: new Date().toISOString(),
  description: 'MorphDrive 3D universal vehicle model inventory',
  vehicleCount: VEHICLE_CATALOG.length,
  vehicles: []
};

const summary = [
  'MORPHDRIVE 3D — UNIVERSAL VEHICLE INVENTORY',
  '============================================',
  `Vehicles in catalog: ${VEHICLE_CATALOG.length}`,
  ''
];

for (const model of VEHICLE_CATALOG) {
  const relativePath = model.url.replace(/^\/+/, '');
  const modelPath = path.join('public', relativePath);

  console.log(`Inspecting ${model.name} (${model.id})...`);

  try {
    if (!fs.existsSync(modelPath)) {
      throw new Error(`File not found: ${modelPath}`);
    }

    const result = inspectGLB(modelPath);

    inventory.vehicles.push({
      id: model.id,
      name: model.name,
      type: model.type,
      category: model.category,
      url: model.url,
      file: relativePath,
      status: 'success',
      ...result
    });

    summary.push(
      `[SUCCESS] ${model.name} (${model.id})`,
      `  Type: ${model.type}`,
      `  File: ${relativePath}`,
      `  Size: ${(result.fileSizeBytes / 1048576).toFixed(2)} MB`,
      `  Nodes: ${result.nodeCount}`,
      `  Reachable nodes: ${result.reachableNodeCount}`,
      `  Meshes: ${result.meshCount}`,
      `  Materials: ${result.materialCount}`,
      `  Vertices: ${result.totalVertices}`,
      `  Triangles: ${result.totalTriangles}`,
      ''
    );

    console.log(
      `  OK: ${result.meshCount} meshes, ` +
      `${result.totalTriangles} triangles`
    );
  } catch (error) {
    inventory.vehicles.push({
      id: model.id,
      name: model.name,
      type: model.type,
      url: model.url,
      file: relativePath,
      status: 'failed',
      error: error.message
    });

    summary.push(
      `[FAILED] ${model.name} (${model.id})`,
      `  File: ${relativePath}`,
      `  Error: ${error.message}`,
      ''
    );

    console.error(`  FAILED: ${error.message}`);
  }
}

const successful = inventory.vehicles.filter(
  vehicle => vehicle.status === 'success'
).length;

const failed = inventory.vehicles.length - successful;

inventory.summary = {
  successful,
  failed,
  total: inventory.vehicles.length
};

summary.push(
  'FINAL SUMMARY',
  '=============',
  `Successful: ${successful}`,
  `Failed: ${failed}`,
  `Total: ${inventory.vehicles.length}`
);

fs.writeFileSync(jsonPath, JSON.stringify(inventory, null, 2));
fs.writeFileSync(summaryPath, summary.join('\n'));

console.log('\n========== FINAL SUMMARY ==========');
console.log(`Successful: ${successful}`);
console.log(`Failed: ${failed}`);
console.log(`JSON: ${jsonPath}`);
console.log(`Summary: ${summaryPath}`);
