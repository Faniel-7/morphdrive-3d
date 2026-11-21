import * as THREE from 'three';

const HONDA_EXPLOSION_SPACING = 2.5;

// Honda CBR650R only.
// The model's front wheel is toward negative Z and rear wheel toward positive Z.
// Bone groups are selected so nested children are not moved twice.

const HONDA_BONE_COMPONENTS = [
  { name: 'Body shell', bone: 'bodyshell_32', offset: [0, 0.55, 0] },
  { name: 'Engine assembly', bone: 'enginecbr_33', offset: [0.65, 0.05, 0] },
  { name: 'Rear swingarm assembly', bone: 'swingarm_17', offset: [0.55, 0.25, 0.35] },
  { name: 'Front fork assembly', bone: 'forks_u_28', offset: [-0.55, 0.35, -0.35] },
  { name: 'Handlebars', bone: 'handlebars_20', offset: [0, 0.65, -0.15] },
  { name: 'Exhaust assembly', bone: 'misc_a_35', offset: [0.65, -0.05, 0.2] },
  { name: 'Left-side details', bone: 'misc_b_36', offset: [-0.65, 0.2, 0] },
  { name: 'Right-side details', bone: 'misc_g_37', offset: [0.65, 0.45, -0.2] },
  { name: 'Indicator assembly', bone: 'misc_c_40', offset: [-0.7, 0.45, 0.3] },
  { name: 'Additional rear details', bone: 'misc_d_30', offset: [0, 0.7, 0.55] },
  { name: 'Left tail light', bone: 'taillight_l_29', offset: [-0.35, 0.4, 0.65] },
  { name: 'Right tail light', bone: 'taillight_r_31', offset: [0.35, 0.4, 0.65] },
  { name: 'Left auxiliary light', bone: 'extralight_1_9', offset: [-0.45, 0.75, -0.45] },
  { name: 'Right auxiliary light', bone: 'extralight_2_10', offset: [0.45, 0.75, -0.45] },
  { name: 'Left headlight', bone: 'headlight_l_7', offset: [-0.35, 0.45, -0.6] },
  { name: 'Right headlight', bone: 'headlight_r_8', offset: [0.35, 0.45, -0.6] },
  { name: 'Dashboard', bone: 'dials_41', offset: [0, 0.8, -0.1] }
];

function getRenderables(group) {
  const result = [];

  group.traverse(object => {
    if (object.isMesh || object.isSkinnedMesh || object.isInstancedMesh) {
      result.push(object);
    }
  });

  return result;
}

export function getHondaCBR650RExplosionPlan(root) {
  root.updateWorldMatrix(true, true);

  const records = [];
  const missingBones = [];

  // Each selected bone controls its own skinned component group.
  // chassis_43 remains the central frame anchor.
  // forks_l_27, wheel bones, brake-disc bones, and indicator child bones
  // are deliberately not selected separately because their parent groups
  // already carry them.
  for (const component of HONDA_BONE_COMPONENTS) {
    const bone = root.getObjectByName(component.bone);

    if (!bone || !bone.isBone) {
      missingBones.push(component.bone);
      continue;
    }

    records.push({
      name: component.name,
      object: bone,
      objects: [bone],
      renderables: [],
      offset: new THREE.Vector3(...component.offset).multiplyScalar(HONDA_EXPLOSION_SPACING)
    });
  }

  // The ordinary wheel geometry is stored as separate Object3D groups.
  // Move all pieces of each wheel by the same offset to preserve alignment.
  const frontWheelGroups = [];
  const rearWheelGroups = [];

  root.traverse(object => {
    if (object.name.startsWith('wheel_lfchild')) {
      if (getRenderables(object).length > 0) {
        frontWheelGroups.push(object);
      }
    } else if (object.name.startsWith('wheel_lrchild')) {
      if (getRenderables(object).length > 0) {
        rearWheelGroups.push(object);
      }
    }
  });

  if (frontWheelGroups.length > 0) {
    records.push({
      name: 'Front wheel assembly',
      objects: frontWheelGroups,
      renderables: frontWheelGroups.flatMap(getRenderables),
      offset: new THREE.Vector3(0, 0.15, -0.65).multiplyScalar(HONDA_EXPLOSION_SPACING)
    });
  }

  if (rearWheelGroups.length > 0) {
    records.push({
      name: 'Rear wheel assembly',
      objects: rearWheelGroups,
      renderables: rearWheelGroups.flatMap(getRenderables),
      offset: new THREE.Vector3(0, 0.15, 0.65).multiplyScalar(HONDA_EXPLOSION_SPACING)
    });
  }

  console.log('[Honda CBR650R] Explosion plan:', {
    expectedBoneGroups: HONDA_BONE_COMPONENTS.length,
    foundBoneGroups: HONDA_BONE_COMPONENTS.length - missingBones.length,
    frontWheelPieces: frontWheelGroups.length,
    rearWheelPieces: rearWheelGroups.length,
    logicalComponents: records.length,
    missingBones
  });

  console.table(records.map(record => ({
    component: record.name,
    objects: record.objects.length,
    meshes: record.renderables.length,
    offset: record.offset.toArray()
  })));

  if (
    missingBones.length > 0 ||
    frontWheelGroups.length !== 10 ||
    rearWheelGroups.length !== 10
  ) {
    console.error('[Honda CBR650R] Component plan validation failed.');
    return [];
  }

  return records;
}
