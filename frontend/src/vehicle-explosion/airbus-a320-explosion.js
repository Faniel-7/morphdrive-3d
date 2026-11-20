import * as THREE from 'three';

function isRenderable(object) {
  return Boolean(
    object &&
    (object.isMesh || object.isSkinnedMesh || object.isInstancedMesh)
  );
}

function getRenderableDescendants(group) {
  const objects = [];

  group.traverse(object => {
    if (isRenderable(object)) objects.push(object);
  });

  return objects;
}

function getBounds(objects) {
  const bounds = new THREE.Box3();

  for (const object of objects) {
    bounds.union(new THREE.Box3().setFromObject(object));
  }

  return bounds;
}

function getStableDirection(index) {
  const angle = index * 2.399963229728653;

  return new THREE.Vector3(
    Math.cos(angle),
    Math.sin(angle),
    Math.sin(angle * 0.73)
  ).normalize();
}

function getClusterName(x) {
  if (x < -35) return 'nose';
  if (x < 0) return 'forward-middle';
  if (x < 45) return 'wing-center';
  return 'rear-tail';
}

function getComponentOffset(record, clusterBounds, index) {
  const clusterCenter = clusterBounds.getCenter(
    new THREE.Vector3()
  );

  const clusterSize = clusterBounds.getSize(
    new THREE.Vector3()
  );

  const clusterDiagonal = Math.max(clusterSize.length(), 0.5);

  const direction = record.center.clone().sub(clusterCenter);

  if (direction.lengthSq() < 0.000001) {
    direction.copy(getStableDirection(index));
  } else {
    direction.normalize();
  }

  direction.addScaledVector(
    getStableDirection(index + 17),
    0.24
  ).normalize();

  const separation =
    clusterDiagonal * 0.28 +
    record.diagonal * 0.15;

  return direction.multiplyScalar(separation);
}

export function getA320ExplosionPlan(root) {
  root.updateWorldMatrix(true, true);

  // The original report confirms 212 direct component groups here.
  let sceneRoot = null;

  root.traverse(object => {
    if (object.name === 'GLTF_SceneRootNode') {
      sceneRoot = object;
    }
  });

  if (!sceneRoot) {
    console.error(
      '[A320] GLTF_SceneRootNode was not found.'
    );
    return [];
  }

  const records = [];

  for (const group of sceneRoot.children) {
    if (isRenderable(group)) continue;

    const renderables = getRenderableDescendants(group);
    if (renderables.length === 0) continue;

    const bounds = getBounds(renderables);
    if (bounds.isEmpty()) continue;

    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());

    records.push({
      object: group,
      renderables,
      name: group.name || group.type,
      cluster: getClusterName(center.x),
      bounds,
      center,
      size,
      diagonal: size.length()
    });
  }

  if (records.length === 0) {
    console.error('[A320] No component groups were found.');
    return [];
  }

  const clusterBounds = new Map();

  for (const record of records) {
    if (!clusterBounds.has(record.cluster)) {
      clusterBounds.set(record.cluster, new THREE.Box3());
    }

    clusterBounds.get(record.cluster).union(record.bounds);
  }

  const aircraftBounds = new THREE.Box3().setFromObject(root);
  const minimumHeight = aircraftBounds.min.z + 0.15;

  records.forEach((record, index) => {
    const offset = getComponentOffset(
      record,
      clusterBounds.get(record.cluster),
      index
    );

    // Z is the aircraft's vertical axis.
    const projectedBottom = record.bounds.min.z + offset.z;

    if (projectedBottom < minimumHeight) {
      offset.z += minimumHeight - projectedBottom;
    }

    record.offset = offset;
  });

  const summary = {};

  for (const record of records) {
    summary[record.cluster] =
      (summary[record.cluster] || 0) + 1;
  }

  console.log('[A320] Complete component explosion plan:', {
    componentGroups: records.length,
    renderableMeshes: records.reduce(
      (total, record) => total + record.renderables.length,
      0
    ),
    clusters: summary
  });

  console.table(records.map(record => ({
    component: record.name,
    cluster: record.cluster,
    meshes: record.renderables.length,
    offset: record.offset.toArray().map(v => Number(v.toFixed(2)))
  })));

  return records;
}
