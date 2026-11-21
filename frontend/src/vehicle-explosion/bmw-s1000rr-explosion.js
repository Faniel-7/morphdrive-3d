/*
 * BMW S1000 RR dedicated exploded-view plan.
 *
 * Move rigged assemblies through their controlling bones.
 * Parent assemblies intentionally include their nested bones.
 * The two ordinary wheel mesh groups are handled separately.
 */

const BMW_COMPONENTS = [
  ['bodyshell_41', [0, 1.05, 0]],
  ['engineblock_40', [0, -0.95, 0]],
  ['handlebars_21', [0, 1.35, 0.55]],
  ['forks_u_25', [-1.15, 0.35, 0.75]],
  ['swingarm_30', [1.15, 0.3, -0.75]],
  ['cockpit_26', [0, 1.45, 0.75]],
  ['dials_10', [0, 1.85, 0.25]],
  ['interior_13', [0, 1.45, -0.2]],
  ['headlight_l_14', [-0.85, 1.05, 1.0]],
  ['headlight_r_15', [0.85, 1.05, 1.0]],
  ['seat_f_16', [-0.65, 1.05, -0.3]],
  ['seat_32', [0, 1.35, -0.85]],
  ['rear-seat_33', [0.65, 1.65, -1.05]],
  ['rear-frame_31', [1.0, 0.65, -1.0]],
  ['brakelight_l_39', [0, 1.25, -1.4]],
  ['extra_7_42', [-1.0, 0.75, -0.55]],
  ['exhaust_1_34', [-1.15, -0.45, -0.55]],
  ['exhaust_2_35', [-1.4, -0.2, -0.4]],
  ['exhaust_3_36', [-1.65, 0.05, -0.25]],
  ['exhaust_4_37', [-1.9, 0.3, -0.1]],
  ['exhaust_5_38', [-2.15, 0.55, 0.05]],
  ['wheel_lf.child_78', [-1.45, 0.25, 0.85]],
  ['wheel_lr.child_79', [1.45, 0.25, -0.85]]
];

export function getBMWS1000RRExplosionPlan(root) {
  if (!root) return [];

  const objectsByName = new Map();

  root.traverse(object => {
    if (!objectsByName.has(object.name)) {
      objectsByName.set(object.name, object);
    }
  });

  const plan = [];

  for (const [name, offset] of BMW_COMPONENTS) {
    const object = objectsByName.get(name);

    if (!object) {
      console.warn(`[BMW S1000 RR] Component not found: ${name}`);
      continue;
    }

    if (!object.parent) {
      console.warn(`[BMW S1000 RR] Component has no parent: ${name}`);
      continue;
    }

    plan.push({
      object,
      offset: offset.map(value => value * 2.5),
      name
    });
  }

  console.info(
    `[BMW S1000 RR] Explosion plan: ${plan.length}/${BMW_COMPONENTS.length} components found.`
  );

  return plan;
}
