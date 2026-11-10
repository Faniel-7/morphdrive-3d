# MorphDrive 3D

**An interactive computer vision system for controlling, disassembling, manipulating, and reassembling 3D vehicles using real-time hand gestures.**

MorphDrive 3D is a computer vision and 3D interaction project that aims to make vehicle exploration more intuitive through real-time hand tracking. It combines hand landmark detection, 3D model visualization, and gesture-based interaction to build a foundation for natural interaction with virtual vehicles.

## Project Overview

The project explores how computer vision can be integrated with interactive 3D environments.

The long-term vision is to allow users to interact with 3D vehicle models through natural hand movements rather than relying entirely on traditional mouse and keyboard controls.

Current development focuses on building a reliable real-time hand-tracking system and connecting detected hand movements to 3D objects.

## Current Features

- Real-time webcam-based hand tracking.
- Detection of up to two hands.
- 21 hand landmarks per detected hand using MediaPipe.
- 3D anatomical hand model using a rigged GLB asset.
- Three.js-based 3D hand visualization.
- Cyan holographic wireframe appearance.
- Finger-bone mapping for 3D hand movement.
- Hand position and orientation tracking.
- Camera preview with detected hand landmarks.
- Interactive 3D vehicle viewer.
- Vehicle appearance customization.
- Interactive model viewing controls.
- Help panel and user controls guide.

## Planned Features

- Gesture-controlled 3D vehicle interaction.
- Support for multiple vehicle models.
- Interactive vehicle disassembly.
- Individual component selection and manipulation.
- Gesture-controlled component movement.
- Vehicle reassembly.
- Improved gesture recognition and interaction controls.

## Technology Stack

| Technology | Purpose |
|---|---|
| JavaScript | Main application logic |
| Three.js | 3D rendering and interaction |
| MediaPipe Tasks Vision | Real-time hand landmark detection |
| HTML5 and CSS3 | Web interface |
| Vite | Frontend development server |
| Python | Computer vision development environment |
| Git and GitHub | Version control |

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
│   │       ├── mediapipe/
│   │       └── sedan.glb
│   └── src/
├── .gitignore
└── README.md
```

## Requirements

- Node.js and npm
- Python 3
- A working webcam
- A modern browser with WebGL support
- Git

A dedicated GPU is not required for the lightweight development prototype. However, performance depends on the computer's CPU and graphics hardware.

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/Faniel-7/morphdrive-3d.git
```

### 2. Enter the frontend directory

```bash
cd morphdrive-3d/frontend
```

### 3. Install dependencies

```bash
npm install
```

## Running the Project

Start the development server:

```bash
npm run dev
```

Open the local URL displayed by Vite in your browser.

Allow webcam access when prompted.

**Note:** Webcam access generally requires a secure context, such as `localhost` or an HTTPS connection.

## User Guide

For instructions on navigating the 3D vehicle viewer, using model tools, customizing vehicle appearance, and activating hand interaction, see the controls guide:

[**MorphDrive 3D Controls Guide**](docs/controls.md)

## Development Status

MorphDrive 3D is currently under active development.

The current development milestone focuses on:

- Real-time hand detection.
- 3D anatomical hand visualization.
- Hand position and orientation tracking.
- Connecting computer vision with the 3D environment.
- Improving the overall interaction experience.

The larger gesture-controlled vehicle disassembly and reassembly system is planned as a future development stage.

## Project Goal

The long-term goal is to create an interactive 3D vehicle exploration environment where users can:

1. Select and explore different vehicle models.
2. Disassemble vehicles into individual components.
3. Select and manipulate individual parts using hand gestures.
4. Move components naturally within the 3D environment.
5. Reassemble vehicles through interactive gestures.

MorphDrive 3D aims to make 3D vehicle exploration more intuitive by combining computer vision with real-time 3D interaction.

## Author

**Faniel-7**

GitHub: [https://github.com/Faniel-7](https://github.com/Faniel-7)

---

*MorphDrive 3D — Bringing natural hand interaction into 3D vehicle exploration.*