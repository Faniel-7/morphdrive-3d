
export function diagnoseSkinnedComponents(root) {
  if (!root) {
    console.error('No vehicle root provided.');
    return [];
  }

  root.updateWorldMatrix(true, true);

  const meshRecords = [];
  const boneMap = new Map();

  root.traverse(object => {
    if (!object.isSkinnedMesh) return;

    const skeleton = object.skeleton;
    const skinIndex = object.geometry?.getAttribute('skinIndex');
    const skinWeight = object.geometry?.getAttribute('skinWeight');

    if (!skeleton || !skinIndex || !skinWeight) return;

    const influences = new Map();

    for (let vertex = 0; vertex < skinIndex.count; vertex++) {
      for (let slot = 0; slot < 4; slot++) {
        const boneIndex = skinIndex.getComponent(vertex, slot);
        const weight = skinWeight.getComponent(vertex, slot);

        if (weight <= 0) continue;

        const bone = skeleton.bones[boneIndex];
        if (!bone) continue;

        const key = `${boneIndex}:${bone.name}`;
        const record = influences.get(key) || {
          boneIndex,
          boneName: bone.name,
          vertexCount: 0,
          weightTotal: 0
        };

        record.vertexCount++;
        record.weightTotal += weight;
        influences.set(key, record);
      }
    }

    const meshInfluences = [...influences.values()];

    meshRecords.push({
      mesh: object.name || '(unnamed)',
      vertices: skinIndex.count,
      influences: meshInfluences
    });

    for (const influence of meshInfluences) {
      const key = `${influence.boneIndex}:${influence.boneName}`;
      const bone = skeleton.bones[influence.boneIndex];

      const group = boneMap.get(key) || {
        boneIndex: influence.boneIndex,
        boneName: influence.boneName,
        parentBone: bone.parent?.name || '(no parent)',
        meshCount: 0,
        totalInfluenceCount: 0,
        meshes: []
      };

      group.meshCount++;
      group.totalInfluenceCount += influence.vertexCount;
      group.meshes.push({
        name: object.name || '(unnamed)',
        vertices: skinIndex.count,
        influencedVertices: influence.vertexCount
      });

      boneMap.set(key, group);
    }
  });

  const boneGroups = [...boneMap.values()]
    .sort((a, b) => b.totalInfluenceCount - a.totalInfluenceCount);

  console.log('===== MESH TO BONE SUMMARY =====');
  console.table(meshRecords.map(record => ({
    mesh: record.mesh,
    vertices: record.vertices,
    controllingBones: record.influences.map(item => item.boneName).join(', ')
  })));

  console.log('===== BONE TO MESH SUMMARY =====');
  console.table(boneGroups.map(group => ({
    bone: group.boneName,
    parent: group.parentBone,
    meshes: group.meshCount,
    influencedVertices: group.totalInfluenceCount
  })));

  console.log('===== COMPLETE BONE GROUP DETAILS =====');
  boneGroups.forEach(group => {
    console.group(`${group.boneName} — ${group.meshCount} meshes`);
    console.table(group.meshes);
    console.groupEnd();
  });

  return { meshRecords, boneGroups };
}

export function createBoneMovementTester(root) {
  if (!root) throw new Error('Vehicle root is required.');

  const boneMap = new Map();
  const meshMap = new Map();

  root.traverse(mesh => {
    if (!mesh.isSkinnedMesh || !mesh.skeleton) return;

    const skinIndex = mesh.geometry.getAttribute('skinIndex');
    const skinWeight = mesh.geometry.getAttribute('skinWeight');

    if (!skinIndex || !skinWeight) return;

    mesh.skeleton.bones.forEach((bone, index) => {
      boneMap.set(bone.name, bone);

      let influenced = false;

      for (let vertex = 0; vertex < skinIndex.count && !influenced; vertex++) {
        for (let slot = 0; slot < 4; slot++) {
          if (
            skinIndex.getComponent(vertex, slot) === index &&
            skinWeight.getComponent(vertex, slot) > 0
          ) {
            influenced = true;
            break;
          }
        }
      }

      if (influenced) {
        const meshes = meshMap.get(bone.name) || [];
        meshes.push(mesh);
        meshMap.set(bone.name, meshes);
      }
    });
  });

  let activeTest = null;

  function move(boneName, distance = 0.2) {
    if (activeTest) {
      console.warn('Restore the previous test before starting another.');
      return;
    }

    const bone = boneMap.get(boneName);

    if (!bone) {
      console.error('Bone not found:', boneName);
      return;
    }

    const originalPosition = bone.position.clone();

    bone.position.x += distance;

    root.updateMatrixWorld(true);

    const affectedMeshes = meshMap.get(boneName) || [];

    affectedMeshes.forEach(mesh => mesh.skeleton.update());

    activeTest = { bone, originalPosition };

    console.log('BONE MOVEMENT TEST:', boneName);
    console.log('Affected meshes:', affectedMeshes.map(mesh => mesh.name));
    console.log('Temporary local X movement:', distance);
    console.log('Run __morphDriveBoneTest.restore() to restore.');
  }

  function restore() {
    if (!activeTest) {
      console.warn('No active bone test.');
      return;
    }

    activeTest.bone.position.copy(activeTest.originalPosition);

    root.updateMatrixWorld(true);

    root.traverse(mesh => {
      if (mesh.isSkinnedMesh) mesh.skeleton.update();
    });

    console.log('Bone restored:', activeTest.bone.name);
    activeTest = null;
  }

  return { move, restore };
}
