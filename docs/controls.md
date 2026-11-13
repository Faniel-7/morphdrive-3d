# MorphDrive 3D — User Controls Guide

This guide explains how to navigate the 3D viewport, customize vehicle appearance, and use webcam-based hand interaction in MorphDrive 3D.

## 1. Viewport Navigation

Use your mouse to explore the 3D vehicle model.

| Action | Control |
|---|---|
| Rotate the vehicle | Left-click and drag |
| Pan the viewport | Right-click and drag |
| Zoom in or out | Scroll the mouse wheel |
| Restore the default camera view | Select **Reset View** |
| Enter or exit fullscreen | Select **Fullscreen** |

**Tip:** Combine rotation and zoom to inspect the vehicle from different angles.

## 2. Model Tools

The model toolbar provides controls for viewing and inspecting the vehicle.

| Tool | Description |
|---|---|
| **Wireframe** | Toggles the wireframe display of the vehicle model. |
| **Reset View** | Restores the default camera position and viewing angle. |
| **Fullscreen** | Expands the application viewport to fullscreen. |

**Note:** Vehicle disassembly and individual component manipulation are planned features, not currently available controls.

## 3. Material and Appearance

The Properties panel provides options for customizing the vehicle's visual appearance.

| Setting | Description |
|---|---|
| **Body Color** | Changes the vehicle's body color. |
| **Paint Finish** | Selects a Glossy, Metallic, or Matte appearance. |
| **Metallic** | Adjusts the metallic property of the vehicle material. |
| **Roughness** | Controls the surface's smoothness and reflectivity. |
| **Restore Original** | Restores the original material appearance. |

### Understanding Material Settings

- **Metallic:** Higher values give the surface a more metallic appearance.
- **Roughness:** Lower values create smoother, more reflective surfaces. Higher values create rougher, less reflective surfaces.
- **Paint Finish:** Applies predefined material appearances.

These settings customize the vehicle's appearance without changing its original geometry.

## 4. Hand Interaction

MorphDrive 3D uses webcam-based hand tracking powered by MediaPipe.

### Getting Started

1. Select **Enable Hand Control**.
2. Allow camera access when your browser requests permission.
3. Position your hand within the webcam's field of view.
4. Keep your hand visible and ensure the surrounding area is adequately illuminated.
5. Use the tracked hand to interact with supported viewport elements.

### Tracking Information

The interface displays hand-tracking status and orientation information to help users understand whether their hands are being detected.

**Important:** Hand interaction is experimental. Tracking quality depends on camera quality, lighting conditions, hand visibility, and system performance. Available interactions may change as development continues.

## 5. Troubleshooting

| Problem | Suggested solution |
|---|---|
| Webcam does not start | Check browser camera permissions and ensure another application is not using the camera. |
| Hand is not detected | Move your hand into the camera view and improve lighting. |
| Hand tracking is unstable | Keep your hand visible and avoid sudden movements. |
| Vehicle does not respond to hover | Check that the model has loaded and move the pointer over its visible surface. |
| Vehicle is difficult to inspect | Use the mouse wheel to zoom and drag to rotate the view. |
| Camera view becomes confusing | Select **Reset View**. |

## 6. Browser and System Requirements

- A modern browser with WebGL support.
- A webcam for hand interaction.
- Camera permission granted by the browser.
- A secure context for webcam access, normally `localhost` during development or an HTTPS deployment.
- Adequate lighting for reliable hand tracking.

A dedicated graphics card is not required for the prototype, although performance depends on the computer's CPU and graphics hardware.

## 7. Development Status

MorphDrive 3D is an actively developed project.

The current application focuses on:

- Interactive 3D vehicle viewing.
- Vehicle appearance customization.
- Viewport navigation and model inspection.
- Webcam-based hand tracking.
- 3D anatomical hand visualization.

Planned capabilities include:

- Multi-vehicle support.
- Gesture-based vehicle selection.
- Component selection.
- Exploded-view vehicle disassembly.
- Independent component movement and rotation.
- Gesture-controlled component manipulation.
- Interactive vehicle reassembly.

As these capabilities are implemented and tested, this guide will be updated with their controls and instructions.

---

*MorphDrive 3D — Bringing natural hand interaction into 3D vehicle exploration.*