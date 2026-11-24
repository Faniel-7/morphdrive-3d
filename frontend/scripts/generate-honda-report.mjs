import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const projectRoot = path.resolve(process.cwd(), '..');
const modelPath = path.join(
  projectRoot,
  'frontend/public/models/motorcycles/honda_cbr650r.glb'
);
const outputPath = path.join(
  projectRoot,
  'docs/reports/Honda_CBR650R_component_report.txt'
);

const file = fs.readFileSync(modelPath);
const arrayBuffer = file.buffer.slice(
  file.byteOffset,
  file.byteOffset + file.byteLength
);

// Browser-compatible image loading for GLTFLoader in Node.
if (typeof globalThis.self === 'undefined') {
  globalThis.self = globalThis;
}

const loader = new GLTFLoader();

loader.load = undefined;

const gltf = await loader.parseAsync(
  arrayBuffer,
  path.dirname(modelPath) + path.sep
);

const root = gltf.scene;
root.updateMatrixWorld(true);

const records = [];
const depthMap = new Map();

root.traverse(object => {
  const depth = object.parent
    ? (depthMap.get(object.parent) ?? -1) + 1
    : 0;

  depthMap.set(object, depth);

  if (!object.isMesh) {
    records.push({
      object,
      depth,
      mesh: false
    });
    return;
  }

  const geometry = object.geometry;
  const vertices = geometry.attributes.position?.count ?? 0;
  const indices = geometry.index?.count ?? vertices;
  const bounds = new THREE.Box3().setFromObject(object);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());

  records.push({
    object,
    depth,
    mesh: true,
    vertices,
    triangles: Math.floor(indices / 3),
    skinned: object.isSkinnedMesh,
    bounds,
    size,
    center,
    materials: (Array.isArray(object.material)
      ? object.material
      : [object.material])
      .filter(Boolean)
      .map(material => material.name || '(unnamed)')
  });
});

const meshes = records.filter(record => record.mesh);

const totalVertices = meshes.reduce(
  (sum, record) => sum + record.vertices, 0
);
const totalTriangles = meshes.reduce(
  (sum, record) => sum + record.triangles, 0
);

const lines = [];

lines.push('MORPHDRIVE 3D - HONDA CBR650R COMPONENT REPORT');
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push(`Model: ${path.relative(projectRoot, modelPath)}`);
lines.push('');
lines.push('MODEL SUMMARY');
lines.push('='.repeat(90));
lines.push(`Total hierarchy objects: ${records.length}`);
lines.push(`Renderable meshes: ${meshes.length}`);
lines.push(`Skinned meshes: ${meshes.filter(r => r.skinned).length}`);
lines.push(`Ordinary meshes: ${meshes.filter(r => !r.skinned).length}`);
lines.push(`Total vertices: ${totalVertices}`);
lines.push(`Total triangles: ${totalTriangles}`);

lines.push('');
lines.push('TOP-LEVEL COMPONENTS');
lines.push('='.repeat(90));

for (const child of root.children) {
  const descendants = meshes.filter(record => {
    let current = record.object;
    while (current && current !== child) current = current.parent;
    return current === child;
  });

  lines.push('');
  lines.push(`COMPONENT: ${child.name || '(unnamed)'}`);
  lines.push(`Type: ${child.type}`);
  lines.push(`Meshes: ${descendants.length}`);
  lines.push(`Vertices: ${descendants.reduce((s, r) => s + r.vertices, 0)}`);
  lines.push(`Triangles: ${descendants.reduce((s, r) => s + r.triangles, 0)}`);
}

lines.push('');
lines.push('COMPLETE OBJECT HIERARCHY AND MESH DETAILS');
lines.push('='.repeat(90));

for (let i = 0; i < records.length; i++) {
  const record = records[i];
  const object = record.object;
  const indent = '  '.repeat(record.depth);

  lines.push('');
  lines.push(`${indent}[${i}] ${object.name || '(unnamed)'}`);
  lines.push(`${indent}Type: ${object.type}`);
  lines.push(`${indent}Parent: ${object.parent?.name || '(root)'}`);
  lines.push(`${indent}Children: ${object.children.length}`);

  if (!record.mesh) continue;

  lines.push(`${indent}Renderable: YES`);
  lines.push(`${indent}Skinned: ${record.skinned}`);
  lines.push(`${indent}Vertices: ${record.vertices}`);
  lines.push(`${indent}Triangles: ${record.triangles}`);
  lines.push(`${indent}Materials: ${record.materials.join(', ')}`);
  lines.push(`${indent}World position: ${record.center.toArray().map(v => v.toFixed(4)).join(', ')}`);
  lines.push(`${indent}World dimensions: ${record.size.toArray().map(v => v.toFixed(4)).join(', ')}`);
  lines.push(`${indent}Bounds min: ${record.bounds.min.toArray().map(v => v.toFixed(4)).join(', ')}`);
  lines.push(`${indent}Bounds max: ${record.bounds.max.toArray().map(v => v.toFixed(4)).join(', ')}`);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');

console.log('Honda CBR650R report generated.');
console.log(`Meshes: ${meshes.length}`);
console.log(`Vertices: ${totalVertices}`);
console.log(`Triangles: ${totalTriangles}`);
console.log(`Saved: ${outputPath}`);
