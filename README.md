# MorphDrive 3D

**An interactive computer vision system for controlling, disassembling, manipulating, and reassembling 3D vehicles using real-time hand gestures.**

MorphDrive 3D is a computer vision and 3D interaction project that explores a more natural way to interact with virtual vehicles.

By combining real-time hand tracking with interactive 3D visualization, the project aims to let users explore, manipulate, disassemble, and reassemble vehicle models through hand gestures.

The project is being developed as a lightweight web-based application using JavaScript, Three.js, and MediaPipe.

---

## Project Overview

Traditional 3D applications often rely on a mouse and keyboard to interact with virtual objects. MorphDrive 3D explores an alternative approach: using natural hand movements to interact with objects inside a 3D environment.

The project combines:

- Computer vision for real-time hand detection.
- Hand landmark tracking for interpreting hand movement.
- 3D hand visualization for representing detected hands.
- Three.js for rendering and interacting with 3D vehicle models.
- Gesture-based interaction as the foundation for future vehicle manipulation.

The current development stage focuses on refining hand tracking, improving the 3D visualization, and connecting hand movement with the 3D environment.

## Current Features

### Hand Tracking and Visualization

- Real-time webcam-based hand detection.
- Support for detecting up to two hands.
- 21 hand landmarks per detected hand using MediaPipe.
- 3D anatomical hand model using a rigged GLB asset.
- Three.js-based 3D hand visualization.
- Cyan holographic wireframe appearance.
- Finger-bone mapping for 3D hand movement.
- Hand position and orientation tracking.
- Camera preview with detected hand landmarks.

### 3D Vehicle Environment

- Interactive 3D vehicle viewer.
- GLB vehicle model loading.
- Vehicle appearance customization.
- Interactive model viewing controls.
- Hand-tracking integration with the 3D environment.
- Model inspection tools, including wireframe display.
- Help panel and user controls guide.

**Development note:** Hand tracking and vehicle interaction are still being refined. Full gesture-controlled vehicle disassembly, independent component manipulation, and reassembly are planned features rather than completed functionality.

## Planned Features

- Support for multiple vehicle models.
- Natural gesture-based vehicle selection.
- Interactive vehicle disassembly.
- Individual vehicle component selection.
- Independent component movement and rotation.
- Gesture-controlled component manipulation.
- Interactive vehicle reassembly.
- Improved gesture recognition and interaction controls.
- More advanced 3D interaction capabilities.

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
│   │       ├── hand/
│   │       │   └── hand.glb
│   │       ├── mediapipe/
│   │       │   └── hand_landmarker.task
│   │       └── sedan.glb
│   └── src/
│       ├── hand-controller.js
│       ├── main.js
│       └── style.css
├── tests/
├── .gitignore
└── README.md
```

*This structure highlights the main project directories and files. Additional configuration and dependency files are omitted for readability.*

## Requirements

To run the current frontend application, you need:

- Node.js
- npm
- A working webcam for hand interaction
- A modern browser with WebGL support
- Git

A dedicated GPU is not required for the prototype, although performance depends on the computer's CPU and graphics hardware.

**Hardware consideration:** MorphDrive 3D is being developed with lightweight hardware in mind. Performance optimization is important, particularly for real-time webcam processing and 3D rendering.

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

## Running the Project

Start the development server:

```bash
npm run dev
```

Open the local URL displayed in the terminal by Vite.

Allow webcam access when prompted by your browser.

**Important:** Webcam access requires a secure context, such as `localhost` during development or an HTTPS connection when deployed.

## User Guide

For instructions on navigating the 3D vehicle viewer, using model tools, customizing vehicle appearance, and activating hand interaction, see:

[**MorphDrive 3D Controls Guide**](docs/controls.md)

## Development Status

MorphDrive 3D is under active development.

### Current Development Focus

- Improving real-time hand detection.
- Refining two-hand tracking and hand identity.
- Improving 3D anatomical hand visualization.
- Refining hand position and orientation tracking.
- Connecting detected hand movements to the 3D environment.
- Improving application performance and interaction responsiveness.

The larger vehicle disassembly, component manipulation, and reassembly system remains part of the planned development roadmap.

## Project Goals

The long-term goal is to create an interactive 3D vehicle exploration environment where users can:

1. Select and explore different vehicle models.
2. Disassemble vehicles into individual components.
3. Select specific parts using hand gestures.
4. Move and rotate components naturally in 3D space.
5. Reassemble vehicles through interactive gestures.

By combining computer vision with real-time 3D interaction, MorphDrive 3D aims to make vehicle exploration more intuitive, interactive, and accessible.

## Author

**Faniel-7**

GitHub: [https://github.com/Faniel-7](https://github.com/Faniel-7)

---

*MorphDrive 3D — Bringing natural hand interaction into 3D vehicle exploration.*