import * as THREE from 'three';

const MAN_COMPONENT_ROOT =
  'd75ac7d3-ea99-4386-8004-2b8b4d77a8ed';

function isRenderable(object) {
  return Boolean(
    object &&
    (
      object.isMesh ||
      object.isSkinnedMesh ||
      object.isInstancedMesh
    )
  );
}

function getRenderables(group) {
  const objects = [];

  group.traverse(object => {
    if (isRenderable(object)) objects.push(object);
  });

  return objects;
}

function getStableDirection(index) {
  const angle = index * 2.399963229728653;

  return new THREE.Vector3(
    Math.cos(angle),
    Math.sin(angle * 0.73),
    Math.sin(angle)
  ).normalize();
}

export function getMANTGXExplosionPlan(root) {
  root.updateWorldMatrix(true, true);
  // The UUID node is one component group inside RootNode.
  // Its parent contains all MAN TGX component groups.
  let componentAnchor = null;

  root.traverse(object => {
    if (object.name === MAN_COMPONENT_ROOT) {
      componentAnchor = object;
    }
  });

  if (!componentAnchor || !componentAnchor.parent) {
    console.error('[MAN TGX] Component parent root was not found.');
    return [];
  }

  const componentRoot = componentAnchor.parent;

  console.log('[MAN TGX] Component parent root:', {
    name: componentRoot.name,
    directChildren: componentRoot.children.length,
    descendantMeshes: getRenderables(componentRoot).length
  });

  const records = [];

  for (const group of componentRoot.children) {
    const renderables = getRenderables(group);

    if (renderables.length === 0) continue;

    // The .001 group contains several independently identifiable
    // parts. Move its meshes separately instead of moving the
    // entire parent group as one component.
    const splitGroup = group.name.endsWith('001');
    const objectsToMove = splitGroup ? renderables : [group];

    for (const objectToMove of objectsToMove) {
      const partMeshes = isRenderable(objectToMove)
        ? [objectToMove]
        : getRenderables(objectToMove);

      const bounds = new THREE.Box3();

      for (const mesh of partMeshes) {
        bounds.union(new THREE.Box3().setFromObject(mesh));
      }

      if (bounds.isEmpty()) continue;

      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());

      records.push({
        object: objectToMove,
        renderables: partMeshes,
        name: objectToMove.name || objectToMove.type,
        componentName: group.name,
        bounds,
        center,
        size,
        diagonal: size.length()
      });
    }
  }

  if (records.length === 0) {
    console.error('[MAN TGX] No component groups were found.');
    return [];
  }

  const truckBounds = new THREE.Box3();

  for (const record of records) {
    truckBounds.union(record.bounds);
  }

  const truckCenter = truckBounds.getCenter(
    new THREE.Vector3()
  );

  const truckDiagonal = Math.max(
    truckBounds.getSize(new THREE.Vector3()).length(),
    0.5
  );

  records.forEach((record, index) => {
    const direction = record.center.clone().sub(truckCenter);

    if (direction.lengthSq() < 0.000001) {
      direction.copy(getStableDirection(index));
    } else {
      direction.normalize();
    }

    direction.addScaledVector(
      getStableDirection(index + 29),
      0.30
    ).normalize();

    // Match the wider separation used by the helicopter
    // exploded-view approach, using MAN's full truck bounds.
    const separation =
      truckDiagonal * 0.48 +
      record.diagonal * 0.13;

    record.offset = direction.multiplyScalar(separation);
  });

  // Give the selected close-together components their own
  // evenly distributed directions around the truck.
  const separatelySpaced = records.filter(record => {
    const componentName = record.componentName || '';

    return (
      componentName.endsWith('001') ||
      componentName.endsWith('004') ||
      componentName.endsWith('006') ||
      componentName.endsWith('009') ||
      componentName.endsWith('012')
    );
  });

  separatelySpaced.forEach((record, index) => {
    const angle =
      (index / separatelySpaced.length) * Math.PI * 2;

    const direction = new THREE.Vector3(
      Math.cos(angle),
      0.16 * (index % 2 === 0 ? 1 : -1),
      Math.sin(angle)
    ).normalize();

    const separation =
      truckDiagonal * 0.72 +
      record.diagonal * 0.22;

    record.offset = direction.multiplyScalar(separation);
  });

  console.log('[MAN TGX] Individually spaced components:', {
    count: separatelySpaced.length,
    components: separatelySpaced.map(record => record.name)
  });

  console.log('[MAN TGX] Component explosion plan:', {
    componentGroups: records.length,
    renderableMeshes: records.reduce(
      (total, record) => total + record.renderables.length,
      0
    )
  });

  console.table(records.map(record => ({
    component: record.name,
    meshes: record.renderables.length,
    offset: record.offset.toArray().map(
      value => Number(value.toFixed(2))
    )
  })));

  return records;
}
