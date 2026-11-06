# MorphDrive 3D

**An interactive computer vision system for controlling, disassembling, manipulating, and reassembling 3D vehicles using real-time hand gestures.**

MorphDrive 3D is a computer vision and 3D interaction project that aims to make vehicle exploration more intuitive through real-time hand tracking. The system combines hand landmark detection with 3D model visualization to create a foundation for gesture-controlled vehicle interaction.

## Project Overview

The project explores how computer vision can be integrated with interactive 3D environments. Users will be able to interact with vehicle models through natural hand movements rather than relying entirely on traditional mouse and keyboard controls.

The current development focuses on building a reliable real-time hand-tracking system and connecting detected hand movements to 3D objects.

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
| Python | Computer vision development environment |
| HTML5 and CSS3 | Web interface |
| Vite | Frontend development server |
| Git and GitHub | Version control |

## Project Structure

```text
morphdrive-3d/
├── assets/
├── backend/
├── docs/
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
- A webcam
- A modern browser with WebGL support
- Git

A dedicated GPU is not required for the lightweight development prototype, although performance depends on the computer's hardware.

## Installation

Clone the repository:

```bash
git clone https://github.com/Faniel-7/morphdrive-3d.git
```

Enter the project directory:

```bash
cd morphdrive-3d/frontend
```

Install frontend dependencies:

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

**Note:** Camera access generally requires localhost or a secure HTTPS connection.

## Development Status

MorphDrive 3D is currently under active development.

The current milestone focuses on real-time hand detection, 3D anatomical hand visualization, and stable tracking of hand movement.

The larger vehicle interaction system is planned as the next major development stage.

## Project Goal

The long-term goal is to create an interactive 3D vehicle exploration environment where users can use natural hand gestures to inspect, disassemble, manipulate, and reassemble vehicle components.

## Author

**Faniel-7**

GitHub: [https://github.com/Faniel-7](https://github.com/Faniel-7)

---

*MorphDrive 3D — Bringing natural hand interaction into 3D vehicle exploration.*