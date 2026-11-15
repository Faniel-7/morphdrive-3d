# MorphDrive 3D

**An interactive computer vision system for controlling, disassembling, manipulating, and reassembling 3D vehicles using real-time hand gestures.**

MorphDrive 3D is a computer vision and 3D interaction project that explores a more natural way to interact with virtual vehicles.

By combining real-time hand tracking with interactive 3D visualization, the project aims to allow users to explore, manipulate, disassemble, and reassemble different 3D vehicle models through natural hand gestures.

Built as a lightweight web-based application, MorphDrive 3D combines JavaScript, Three.js, and MediaPipe to bring computer vision and interactive 3D environments together.

---

## Project Overview

Traditional 3D applications often rely on a mouse and keyboard to interact with virtual objects. MorphDrive 3D explores an alternative approach by introducing natural hand movements as an interaction method.

The system combines:

- Real-time computer vision and hand detection.
- Hand landmark tracking and movement interpretation.
- 3D anatomical hand visualization.
- Three.js-powered 3D rendering and interaction.
- Vehicle model loading and management.
- Experimental vehicle component and animation testing.
- A foundation for gesture-based 3D manipulation.

The current development focuses on improving hand tracking, refining 3D hand visualization, optimizing the vehicle environment, and establishing reliable connections between hand movements and virtual objects.

## Current Features

### 1. Hand Tracking and Visualization

MorphDrive 3D uses MediaPipe Tasks Vision to detect and track hands through a webcam.

Implemented capabilities include:

- Real-time webcam-based hand detection.
- MediaPipe hand landmark tracking.
- 21 landmarks per detected hand.
- Support for tracking left and right hands.
- 3D anatomical hand model using a rigged GLB asset.
- Three.js-based 3D hand visualization.
- Holographic-style hand visualization.
- Finger-bone mapping for 3D hand movement.
- Hand position and orientation tracking.
- Camera preview with detected hand landmarks.
- Left/right hand hologram assignment correction.

The hand tracking system is still under active refinement. Consistent tracking, natural movement, hand identity stability, and reliable simultaneous two-hand interaction remain important development areas.

### 2. Interactive 3D Vehicle Environment

The application includes a Three.js-powered environment for loading and exploring 3D vehicle models.

Implemented capabilities include:

- Interactive 3D vehicle viewer.
- GLB vehicle model loading.
- Vehicle appearance customization.
- Interactive model viewing controls.
- Hand-tracking integration with the 3D environment.
- Model inspection tools, including wireframe display.
- Separate vehicle-management logic.
- Application help panel and user controls guide.

### 3. Experimental Vehicle Testing

A separate Polestar 3 development page has been introduced to experiment with a vehicle model containing named component anchors and built-in animation clips.

The experimental environment explores:

- Opening and closing vehicle doors.
- Opening and closing the boot.
- Playing available vehicle animation clips.
- Testing component-anchor movement.
- Restoring the vehicle's original arrangement.

**Important:** This is an isolated development environment. It is not yet integrated into the main application. Testing animated components does not mean that complete vehicle disassembly or independent component manipulation has been implemented.

---

## Planned Features

The following capabilities represent the next major development milestones:

### Hand Interaction
- More reliable two-hand tracking.
- Improved hand identity consistency.
- Smoother and more natural hand movement.
- Improved hand orientation and positioning.
- Gesture recognition and interaction states.
- Gesture-based vehicle selection.

### Vehicle Interaction
- Support for multiple vehicle models.
- Interactive vehicle disassembly.
- Individual vehicle component selection.
- Independent component movement and rotation.
- Gesture-controlled component manipulation.
- Interactive vehicle reassembly.
- More advanced 3D object interaction.

### Performance and Optimization
- Improved real-time tracking responsiveness.
- Lightweight 3D rendering.
- Optimized vehicle model loading.
- Efficient computer vision processing.
- Better performance on computers without dedicated GPUs.

---

## Technology Stack

| Technology | Purpose |
|---|---|
| JavaScript | Main application logic |
| Three.js | 3D rendering and interaction |
| MediaPipe Tasks Vision | Real-time hand landmark detection |
| HTML5 | Application structure |
| CSS3 | Interface styling |
| Vite | Frontend development server |
| Python | Supporting computer vision development |
| Git and GitHub | Version control and project hosting |

---

## Project Structure

```text
morphdrive-3d/
├── assets/
├── backend/
├── docs/
│   └── controls.md
├── frontend/
│   ├── public/
│   │   └── models/
│   │       ├── cars/
│   │       ├── hand/
│   │       │   └── hand.glb
│   │       ├── mediapipe/
│   │       │   └── hand_landmarker.task
│   │       └── sedan.glb
│   ├── src/
│   │   ├── hand-controller.js
│   │   ├── main.js
│   │   ├── polestar-test.js
│   │   └── style.css
│   ├── hand-preview.html
│   ├── hand-test.html
│   ├── index.html
│   ├── polestar-test.html
│   ├── vehicle-manager.js
│   ├── package.json
│   └── package-lock.json
├── tests/
├── .gitignore
└── README.md
```

*This structure highlights the main project directories and files. Additional files and model assets may be present.*

---

## Requirements

To run the current frontend application, you need:

- Node.js
- npm
- A working webcam for hand interaction
- A modern browser with WebGL support
- Git

A dedicated GPU is not required for the prototype, although performance depends on the computer's CPU and graphics hardware.

**Hardware consideration:** MorphDrive 3D is being developed with lightweight hardware in mind. Performance optimization is an important part of the development process, particularly for simultaneous webcam processing and 3D rendering.

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/Faniel-7/morphdrive-3d.git
```

### 2. Enter the project directory

```bash
cd morphdrive-3d
```

### 3. Enter the frontend directory

```bash
cd frontend
```

### 4. Install dependencies

```bash
npm install
```

---

## Running the Project

Start the development server:

```bash
npm run dev
```

Open the local URL displayed in the terminal by Vite.

Allow webcam access when prompted by your browser.

**Important:** Webcam access requires a secure context, such as `localhost` during development or an HTTPS connection when deployed.

---

## Experimental Polestar Test

To access the separate Polestar 3 development environment, start the Vite server and visit:

```text
http://localhost:5173/polestar-test.html
```

This page is intended for testing the Polestar model's available animations and component anchors.

It is separate from the main application and is primarily used for experimenting with vehicle component behavior.

---

## User Guide

For instructions on navigating the 3D vehicle viewer, using model tools, customizing vehicle appearance, and activating hand interaction, see:

**[MorphDrive 3D Controls Guide](docs/controls.md)**

---

## Development Status

<em>Active development — prototype stage.</em>

MorphDrive 3D is currently focused on establishing a stable foundation for natural hand-based interaction with 3D vehicle models.

### Current Development Focus

- Improving real-time hand detection.
- Refining simultaneous two-hand tracking.
- Maintaining consistent left/right hand assignment.
- Improving 3D anatomical hand visualization.
- Refining hand positioning and orientation.
- Improving hand movement smoothness and responsiveness.
- Improving vehicle model loading and management.
- Testing vehicle models with built-in animations and component anchors.
- Connecting tracked hand movements to the 3D environment.
- Improving overall application performance.

The complete vehicle disassembly, independent component manipulation, and reassembly system remain major development milestones rather than finished features.

---

## Project Goals

The long-term vision of MorphDrive 3D is to create an interactive 3D vehicle exploration environment where users can:

1. Select and explore different vehicle models.
2. Disassemble vehicles into individual components.
3. Select specific vehicle parts using natural hand gestures.
4. Move and rotate individual components in 3D space.
5. Interact with vehicle components through intuitive gestures.
6. Reassemble vehicles through interactive hand movements.

By combining computer vision, 3D visualization, and natural interaction, MorphDrive 3D aims to make virtual vehicle exploration more intuitive, engaging, and accessible.

---

## Author

**Faniel-7**

GitHub: [https://github.com/Faniel-7](https://github.com/Faniel-7)

---

**MorphDrive 3D — Bringing natural hand interaction into 3D vehicle exploration.**