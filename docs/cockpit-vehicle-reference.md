# MorphDrive 3D — Shared Vehicle Reference

Purpose: Store verified vehicle information for all seven planned feature additions.

## Confirmed shared architecture

- Vehicle models are loaded through frontend/vehicle-manager.js.
- GLTF models are placed inside a wrapper THREE.Group.
- The original GLTF scene transforms are preserved.
- The largest model dimension is normalized to 5 Three.js units.
- Models are centered horizontally and aligned to the ground.
- Normalization is applied using wrapper scale and position.
- The active normalized root is passed to initializeVehicle(root, model).
- Active vehicle ID is maintained in frontend/src/main.js.
- Vehicle loading and replacement are handled by activateVehicle(id).
- The existing OrbitControls camera must remain functional.

## Shared implementation rules

- Do not change existing vehicle normalization.
- Do not unnecessarily modify vehicle loading.
- Keep new features modular.
- Store vehicle-specific measurements and camera positions here.
- Never assume every vehicle has an interior or named cockpit components.
- Record measured values separately from estimated values.

## Vehicle reference records

### Sedan
Status: Pending model inspection.
Model file: frontend/public/models/sedan.glb
Cockpit camera position: Pending.
Look direction: Pending.
Interior mesh names: Pending.
Model orientation: Pending.
Model dimensions: Pending.

### Other vehicles
Record each vehicle here as it is inspected.
