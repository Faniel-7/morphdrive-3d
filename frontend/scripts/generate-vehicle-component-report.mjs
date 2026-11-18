import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const OUTPUT_FILE = path.join(
  PROJECT_ROOT,
  'vehicle-component-report-complete.txt'
);

const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.venv',
  'dist',
  'build',
  'hand'
]);

function findGLBFiles(directory, results = []) {
  if (!fs.existsSync(directory)) return results;

  for (const entry of fs.readdirSync(directory, {
    withFileTypes: true
  })) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORED_DIRECTORIES.has(entry.name)) {
        findGLBFiles(fullPath, results);
      }
      continue;
    }

    if (
      entry.isFile() &&
      entry.name.toLowerCase().endsWith('.glb') &&
      !entry.name.toLowerCase().includes('hand')
    ) {
      results.push(fullPath);
    }
  }

  return results;
}

function getObjectType(object) {
  if (object.isInstancedMesh) return 'InstancedMesh';
  if (object.isSkinnedMesh) return 'SkinnedMesh';
  if (object.isMesh) return 'Mesh';
  if (object.isBone) return 'Bone';
  if (object.isGroup) return 'Group';
  if (object.isScene) return 'Scene';

  return object.type || 'Object3D';
}

function getGeometryInfo(object) {
  if (!object.isMesh || !object.geometry) {
    return {
      vertices: 0,
      triangles: 0,
      instances: 0,
      materials: []
    };
  }

  const geometry = object.geometry;
  const position = geometry.attributes.position;

  const vertices = position ? position.count : 0;

  const indexCount = geometry.index
    ? geometry.index.count
    : vertices;

  const triangles = Math.floor(indexCount / 3);

  const materialList = Array.isArray(object.material)
    ? object.material
    : [object.material];

  const materials = materialList
    .filter(Boolean)
    .map(material => material.name || '(unnamed material)');

  return {
    vertices,
    triangles,
    instances: object.isInstancedMesh
      ? object.count
      : 1,
    materials
  };
}

function getObjectPath(object) {
  const names = [];
  let current = object;

  while (current) {
    names.unshift(
      current.name || `[${current.type || 'Object3D'}]`
    );
    current = current.parent;
  }

  return names.join(' / ');
}

function analyzeScene(root) {
  const objects = [];
  const objectDepth = new Map();

  root.traverse(object => {
    const depth = object.parent
      ? (objectDepth.get(object.parent) ?? -1) + 1
      : 0;

    objectDepth.set(object, depth);

    objects.push({
      object,
      depth,
      directChildren: object.children.length,
      path: getObjectPath(object),
      geometry: getGeometryInfo(object),
      ownMeshCount: object.isMesh ? 1 : 0,
      descendantMeshCount: 0,
      descendantVertices: 0,
      descendantTriangles: 0
    });
  });

  const recordMap = new Map(
    objects.map(record => [record.object, record])
  );

  // Calculate descendant totals from the bottom of the hierarchy.
  for (let i = objects.length - 1; i >= 0; i--) {
    const record = objects[i];

    record.descendantMeshCount = record.ownMeshCount;
    record.descendantVertices = record.geometry.vertices;
    record.descendantTriangles = record.geometry.triangles;

    for (const child of record.object.children) {
      const childRecord = recordMap.get(child);

      if (!childRecord) continue;

      record.descendantMeshCount +=
        childRecord.descendantMeshCount;

      record.descendantVertices +=
        childRecord.descendantVertices;

      record.descendantTriangles +=
        childRecord.descendantTriangles;
    }
  }

  return objects;
}

function formatObject(record, index) {
  const object = record.object;
  const info = record.geometry;

  const indent = '  '.repeat(record.depth);

  return [
    `${indent}[${index}] ${object.name || '(unnamed)'}`,
    `Type: ${getObjectType(object)}`,
    `Depth: ${record.depth}`,
    `Parent: ${object.parent?.name || '(root)'}`,
    `Direct children: ${record.directChildren}`,
    `Renderable: ${object.isMesh ? 'YES' : 'NO'}`,
    `Descendant meshes (including self): ${record.descendantMeshCount}`,
    `Vertices: ${info.vertices}`,
    `Triangles: ${info.triangles}`,
    `Instances: ${info.instances}`,
    `Materials: ${info.materials.join(', ') || '(none)'}`,
    `Path: ${record.path}`
  ].join(' | ');
}

async function loadAndAnalyze(filePath, loader) {
  const relativePath = path.relative(PROJECT_ROOT, filePath);
  const fileBuffer = fs.readFileSync(filePath);

  const arrayBuffer = fileBuffer.buffer.slice(
    fileBuffer.byteOffset,
    fileBuffer.byteOffset + fileBuffer.byteLength
  );

  const gltf = await loader.parseAsync(
    arrayBuffer,
    path.dirname(filePath) + path.sep
  );

  const root = gltf.scene;

  if (!root) {
    throw new Error('GLB has no default scene.');
  }

  root.updateMatrixWorld(true);

  const records = analyzeScene(root);

  const renderableObjects = records.filter(
    record => record.object.isMesh
  );

  const topLevelComponents = root.children;

  const totalVertices = renderableObjects.reduce(
    (sum, record) => sum + record.geometry.vertices,
    0
  );

  const totalTriangles = renderableObjects.reduce(
    (sum, record) => sum + record.geometry.triangles,
    0
  );

  const lines = [];

  lines.push('');
  lines.push('='.repeat(100));
  lines.push(`MODEL: ${path.basename(filePath)}`);
  lines.push(`FILE: ${relativePath}`);
  lines.push(`SCENE: ${root.name || '(unnamed scene)'}`);
  lines.push('='.repeat(100));

  lines.push('');
  lines.push('MODEL SUMMARY');
  lines.push('-'.repeat(80));
  lines.push(`Total objects: ${records.length}`);
  lines.push(`Top-level components: ${topLevelComponents.length}`);
  lines.push(`Renderable objects: ${renderableObjects.length}`);
  lines.push(`Total vertices: ${totalVertices}`);
  lines.push(`Total triangles: ${totalTriangles}`);

  lines.push('');
  lines.push('TOP-LEVEL COMPONENT SUMMARY');
  lines.push('-'.repeat(80));

  for (const component of topLevelComponents) {
    const record = records.find(
      item => item.object === component
    );

    if (!record) continue;

    lines.push([
      `Name: ${component.name || '(unnamed)'}`,
      `Type: ${getObjectType(component)}`,
      `Direct children: ${record.directChildren}`,
      `Descendant meshes: ${record.descendantMeshCount}`,
      `Vertices: ${record.descendantVertices}`,
      `Triangles: ${record.descendantTriangles}`
    ].join(' | '));
  }

  lines.push('');
  lines.push('COMPLETE OBJECT HIERARCHY');
  lines.push('-'.repeat(80));

  records.forEach((record, index) => {
    lines.push(formatObject(record, index));
  });

  return lines.join('\n');
}

async function main() {
  console.log('MorphDrive 3D component report generator');
  console.log('Searching for vehicle GLB files...');
  console.log('');

  const files = findGLBFiles(PROJECT_ROOT).sort();

  if (files.length === 0) {
    console.error('No vehicle GLB files found.');
    process.exitCode = 1;
    return;
  }

  console.log(`Found ${files.length} GLB files.`);
  console.log('Loading models one at a time to reduce memory usage.');
  console.log('');

  const loader = new GLTFLoader();

  const report = [];

  report.push('MORPHDRIVE 3D - COMPLETE VEHICLE COMPONENT REPORT');
  report.push(`Generated: ${new Date().toISOString()}`);
  report.push(`Project: ${PROJECT_ROOT}`);
  report.push(`GLB files found: ${files.length}`);
  report.push('');
  report.push('This report describes the actual GLB hierarchy.');
  report.push('Descendant mesh counts include the object itself when it is a mesh.');
  report.push('');

  let successful = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    console.log(
      `[${i + 1}/${files.length}] ${path.basename(file)}`
    );

    try {
      const modelReport = await loadAndAnalyze(file, loader);
      report.push(modelReport);
      successful++;
    } catch (error) {
      failed++;

      report.push('');
      report.push('='.repeat(100));
      report.push(`FAILED MODEL: ${file}`);
      report.push(`ERROR: ${error.stack || error.message}`);
      report.push('='.repeat(100));

      console.error(`Failed: ${error.message}`);
    }
  }

  report.push('');
  report.push('='.repeat(100));
  report.push('FINAL REPORT SUMMARY');
  report.push(`Models found: ${files.length}`);
  report.push(`Successfully analyzed: ${successful}`);
  report.push(`Failed: ${failed}`);
  report.push('='.repeat(100));

  fs.writeFileSync(
    OUTPUT_FILE,
    report.join('\n'),
    'utf8'
  );

  console.log('');
  console.log('REPORT GENERATED');
  console.log(`Successful models: ${successful}`);
  console.log(`Failed models: ${failed}`);
  console.log(`Saved to: ${OUTPUT_FILE}`);
}

main().catch(error => {
  console.error('Report generation failed:', error);
  process.exitCode = 1;
});
