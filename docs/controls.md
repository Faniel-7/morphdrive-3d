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

**Development note:** Vehicle disassembly and independent component manipulation are not yet available as controls in the main application.

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
5. Use the tracked hand to interact with the features currently supported by the application.

### Tracking Information

The interface displays hand-tracking status and orientation information to help users understand whether their hands are being detected.

**Important:** Hand interaction is experimental. Tracking quality depends on camera quality, lighting conditions, hand visibility, and system performance. Hand detection, identity tracking, and interaction responsiveness are still being refined.

## 5. Experimental Vehicle Testing

The project includes a separate Polestar 3 test page for experimenting with vehicle animations and component-anchor movement.

This page is intended for development and testing. It is separate from the main application and does not mean that gesture-controlled vehicle disassembly is already available.

To open the test page while the Vite development server is running, visit:

`http://localhost:5173/polestar-test.html`

The test page provides controls for trying the available door and boot animations, testing the vehicle's component anchors, and restoring the original arrangement.

**Note:** The test page and its interactions should be considered experimental until they have been tested and validated.

## 6. Troubleshooting

| Problem | Suggested solution |
|---|---|
| Webcam does not start | Check browser camera permissions and ensure another application is not using the camera. |
| Hand is not detected | Move your hand into the camera view and improve lighting. |
| Hand tracking is unstable | Keep your hand visible and avoid sudden movements. |
| Vehicle does not respond to hover | Check that the model has loaded and move the pointer over its visible surface. |
| Vehicle is difficult to inspect | Use the mouse wheel to zoom and drag to rotate the view. |
| Camera view becomes confusing | Select **Reset View**. |
| Polestar test page does not load | Confirm that the Vite development server is running and that the model asset is available at its expected path. |

## 7. Browser and System Requirements

- A modern browser with WebGL support.
- A webcam for hand interaction.
- Camera permission granted by the browser.
- A secure context for webcam access, normally `localhost` during development or an HTTPS deployment.
- Adequate lighting for reliable hand tracking.

A dedicated graphics card is not required for the prototype, although performance depends on the computer's CPU and graphics hardware.

## 8. Development Status

MorphDrive 3D is an actively developed project.

The current application focuses on:

- Interactive 3D vehicle viewing.
- Vehicle appearance customization.
- Viewport navigation and model inspection.
- Webcam-based hand tracking.
- 3D anatomical hand visualization.
- Vehicle model management and experimentation.

Experimental development work also includes testing vehicle models with named component anchors and built-in animations.

Planned capabilities include:

- Gesture-based vehicle selection.
- Component selection.
- Exploded-view vehicle disassembly.
- Independent component movement and rotation.
- Gesture-controlled component manipulation.
- Interactive vehicle reassembly.

As these capabilities are implemented and tested, this guide will be updated with their controls and instructions.

---

*MorphDrive 3D — Bringing natural hand interaction into 3D vehicle exploration.*