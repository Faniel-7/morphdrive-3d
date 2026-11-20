import * as THREE from 'three';

const SU57_OFFSETS = {
  'SU57-airframe_0': [0, 0.55, 0],
  'SU57-canopy_1': [0, 1.35, 0.65],
  'SU57-cockpit_2': [1.35, 0.9, 0],
  'SU57-hud_3': [2.2, 1.65, 0.55],
  'SU57-instrGlass_4': [-1.45, 1.0, -1.35],
  'SU57-landingOff_5': [1.15, 1.2, 1.55],
  'SU57-landingOn_6': [-1.15, 1.45, -1.65],
  'SU57-landingOnLight_7': [2.0, 1.9, -0.7]
};

function getRenderables(group) {
  const objects = [];

  group.traverse(object => {
    if (
      object.isMesh ||
      object.isSkinnedMesh ||
      object.isInstancedMesh
    ) {
      objects.push(object);
    }
  });

  return objects;
}

export function getSukhoiSU57ExplosionPlan(root) {
  root.updateWorldMatrix(true, true);

  const records = [];

  root.traverse(object => {
    const offset = SU57_OFFSETS[object.name];

    if (!offset) return;

    const renderables = getRenderables(object);

    if (renderables.length === 0) return;

    records.push({
      object,
      renderables,
      name: object.name,
      offset: new THREE.Vector3(...offset)
    });
  });

  console.log('[Su-57] Component explosion plan:', {
    components: records.length,
    expectedComponents: Object.keys(SU57_OFFSETS).length,
    names: records.map(record => record.name)
  });

  console.table(records.map(record => ({
    component: record.name,
    meshes: record.renderables.length,
    offset: record.offset.toArray()
  })));

  return records;
}
