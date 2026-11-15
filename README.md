# MorphDrive 3D

**An interactive computer vision system for exploring, controlling, disassembling, manipulating, and reassembling 3D vehicles using natural hand gestures.**

MorphDrive 3D is a computer vision and interactive 3D visualization project that explores a more natural way to interact with virtual vehicles.

By combining real-time hand tracking, 3D visualization, and gesture-based interaction, the project aims to let users explore different vehicle models, manipulate their components, and eventually disassemble and reassemble complete vehicles using natural hand movements.

Built as a web-based application, MorphDrive 3D combines JavaScript, Three.js, and MediaPipe to bring computer vision and interactive 3D environments together.

---

## Project Overview

Traditional 3D applications often rely on a mouse and keyboard to interact with virtual objects. MorphDrive 3D explores an alternative approach by introducing natural hand movements as an interaction method.

The project brings together:

- Real-time computer vision and hand detection.
- Hand landmark tracking and movement interpretation.
- 3D anatomical hand visualization.
- Three.js-powered 3D rendering and interaction.
- A multi-vehicle 3D showroom.
- Vehicle model loading and management.
- Vehicle appearance customization.
- Experimental vehicle component analysis and explosion functionality.
- A foundation for gesture-controlled 3D manipulation.

The current development focuses on improving hand tracking, refining the 3D hand visualization, expanding vehicle interaction, and establishing reliable connections between hand movements and virtual objects.

## Current Features

### 1. Real-Time Hand Tracking and Visualization

MorphDrive 3D uses MediaPipe Tasks Vision to detect and track hands through a webcam.

Implemented capabilities include:

- Real-time webcam-based hand detection.
- MediaPipe hand landmark tracking.
- 21 landmarks per detected hand.
- Left and right hand identification.
- A rigged 3D anatomical hand model using a GLB asset.
- Three.js-based 3D hand visualization.
- Holographic-style hand visualization.
- Finger-bone mapping for 3D hand movement.
- Hand position and orientation tracking.
- Camera preview with detected hand landmarks.

**Development status:** Hand tracking and 3D visualization are implemented, but orientation, movement stability, hand identity consistency, and simultaneous two-hand tracking are still being refined.

### 2. Interactive 3D Vehicle Showroom

The application includes a Three.js-powered showroom for loading and exploring different vehicle models.

The vehicle catalog currently contains 16 models across five categories:

| Category | Available models |
|---|---|
| Cars | Sedan, Lamborghini Urus Performante, Ford F-150 Raptor, Lamborghini Centenario, Polestar 3, Skoda Elroq |
| Motorcycles | BMW S1000 RR, Honda CBR650R, Kawasaki Ninja H2, Sports Bike |
| Aircraft | Airbus A320, Boeing 787, Sukhoi Su-57 |
| Helicopters | AH-64E Apache Guardian, Realistic Helicopter |
| Trucks | MAN TGX |

Implemented showroom capabilities include:

- Vehicle catalog and category-based selection.
- GLB 3D model loading.
- Interactive 3D vehicle viewing.
- Vehicle appearance customization.
- Wireframe visualization.
- Vehicle inspection and management tools.
- Integration with the hand-tracking environment.
- Application help panel and controls guide.

Not every vehicle currently has the same level of component-level interaction. Functionality depends on the structure and organization of each 3D model.

### 3. Experimental Vehicle Component Interaction

MorphDrive 3D includes an experimental vehicle component system designed to support vehicle disassembly and reassembly.

The current development includes:

- Vehicle-specific component configuration.
- Named component and assembly identification.
- Component hierarchy analysis.
- Detection of renderable component assemblies.
- Experimental component explosion logic.
- Component position preservation.
- Restoration of component positions during assembly.
- A specialized existing explosion workflow for the Sedan.

The system is being developed to support different vehicle models while preserving their original structure.

**Important:** Component explosion and reassembly are still under active development and require further testing. Not every vehicle currently has a verified component configuration. Full gesture-controlled component selection, independent rotation, and manipulation are not yet complete.

### 4. Experimental Polestar 3 Environment

A separate Polestar 3 development page is available for experimenting with a vehicle model containing named component anchors and built-in animation clips.

The experimental environment explores:

- Opening and closing vehicle doors.
- Opening and closing the boot.
- Playing available vehicle animation clips.
- Testing component-anchor movement.
- Restoring the vehicle's original arrangement.

This environment is separate from the main application and is primarily intended for testing vehicle animation and component behavior.

---

## Planned Features

The following capabilities represent the next major development milestones.

### Hand Interaction

- More reliable simultaneous two-hand tracking.
- Improved hand identity consistency.
- Smoother and more natural hand movement.
- Improved hand orientation and positioning.
- Gesture recognition and interaction states.
- Gesture-based vehicle and component selection.
- More accurate hand-to-object interaction.

### Vehicle Interaction

- Reliable component explosion across supported vehicle models.
- Individual vehicle component selection.
- Independent component movement and rotation.
- Gesture-controlled component manipulation.
- Interactive vehicle reassembly.
- More advanced 3D object interaction.
- Improved support for different vehicle structures.

### Performance and Optimization

- Improved real-time tracking responsiveness.
- Lightweight 3D rendering.
- Optimized vehicle model loading.
- Efficient computer vision processing.
- Reduced CPU and memory usage.
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
│   │       ├── motorcycles/
│   │       ├── aircraft/
│   │       ├── helicopters/
│   │       ├── hand/
│   │       │   └── hand.glb
│   │       ├── mediapipe/
│   │       │   └── hand_landmarker.task
│   │       └── sedan.glb
│   ├── src/
│   │   ├── showroom/
│   │   │   ├── showroom.js
│   │   │   ├── showroom.css
│   │   │   └── vehicle-catalog.js
│   │   ├── vehicle-explosion/
│   │   │   ├── explosion-config.js
│   │   │   ├── explosion-manager.js
│   │   │   └── vehicle-analyzer.js
│   │   ├── main.js
│   │   ├── hand-controller.js
│   │   └── style.css
│   ├── index.html
│   ├── polestar-test.html
│   ├── package.json
│   └── package-lock.json
├── tests/
├── .gitignore
└── README.md
```

*This is a simplified overview of the main project structure. Additional files, development pages, and model assets may be present.*

---

## Requirements

To run the current frontend application, you need:

- Node.js.
- npm.
- A working webcam for hand interaction.
- A modern browser with WebGL support.
- Git.

A dedicated GPU is not required for the prototype, although performance depends on the computer's CPU and graphics hardware.

**Hardware consideration:** MorphDrive 3D is being developed with lightweight hardware in mind. Performance optimization is an important part of the development process, particularly when running webcam-based computer vision and 3D rendering simultaneously.

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

### Production Build

To generate a production build:

```bash
npm run build
```

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

For instructions on navigating the 3D vehicle showroom, using model tools, customizing vehicle appearance, and activating hand interaction, see:

**[MorphDrive 3D Controls Guide](docs/controls.md)**

---

## Development Status

**Active development — prototype stage.**

MorphDrive 3D is currently focused on establishing a reliable foundation for natural hand-based interaction with 3D vehicle models.

### Current Development Focus

- Improving real-time hand detection.
- Refining simultaneous two-hand tracking.
- Maintaining consistent left/right hand assignment.
- Improving 3D anatomical hand visualization.
- Refining hand positioning and orientation.
- Improving hand movement smoothness and responsiveness.
- Expanding vehicle showroom functionality.
- Improving vehicle model loading and management.
- Developing and validating vehicle component explosion logic.
- Connecting tracked hand movements to the 3D environment.
- Improving overall application performance.

The complete gesture-controlled vehicle disassembly, independent component manipulation, and reassembly system remain major development milestones rather than finished features.

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