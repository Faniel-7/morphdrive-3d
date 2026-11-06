# MorphDrive 3D — System Architecture

## 1. Introduction

MorphDrive 3D combines computer vision and real-time 3D graphics to create a gesture-controlled vehicle interaction environment.

The system is designed to interpret natural hand movements through a webcam and translate them into interactions inside a Three.js 3D scene.

## 2. System Components

### Computer Vision — MediaPipe

MediaPipe Tasks Vision provides real-time hand landmark detection.

The hand landmark model identifies 21 key points for each detected hand, including:

- Wrist
- Thumb joints
- Index finger joints
- Middle finger joints
- Ring finger joints
- Pinky finger joints

The system is configured to detect up to two hands.

### 3D Rendering — Three.js

Three.js is responsible for:

- Creating the 3D scene.
- Managing the camera and renderer.
- Loading 3D GLB models.
- Displaying the anatomical hand model.
- Updating object positions and rotations.
- Rendering the scene in real time.

### 3D Hand Model

The project uses a rigged GLB hand model.

Its skeletal structure contains 21 bones corresponding to the anatomical hand structure.

The detected MediaPipe landmarks are used to calculate finger directions and update the corresponding 3D bones.

### Vehicle Models

Vehicle models are loaded as GLB assets.

The initial vehicle asset is a generic sedan. Additional vehicle models can be introduced as the interaction system develops.

## 3. Processing Pipeline

The intended processing pipeline is:

1. Capture video frames from the webcam.
2. Pass frames to the MediaPipe hand landmarker.
3. Detect hand landmarks and handedness.
4. Retrieve normalized image landmarks and 3D world landmarks.
5. Convert landmark coordinates into the Three.js coordinate system.
6. Calculate palm position and orientation.
7. Map finger landmark directions to the rigged hand skeleton.
8. Update the 3D hand transforms.
9. Render the updated scene.

## 4. Coordinate Systems

MediaPipe provides two useful landmark representations:

**Image landmarks**

Normalized coordinates describing hand position in the camera image.

These coordinates are useful for positioning the 3D hand relative to the camera view.

**World landmarks**

Three-dimensional landmark coordinates describing the hand's spatial structure.

These coordinates are useful for estimating palm orientation and finger directions.

The application converts these coordinates into a consistent Three.js coordinate convention before applying transformations.

## 5. Performance Considerations

The project targets accessible hardware, including systems with integrated graphics.

Current optimization considerations include:

- Limiting renderer pixel ratio.
- Disabling unnecessary antialiasing.
- Limiting hand detection frequency.
- Avoiding duplicate video-frame processing.
- Reusing Three.js objects and temporary vectors.
- Applying smoothing to reduce sudden movement.
- Keeping the 3D scene lightweight.

Actual performance depends on the device, browser, camera resolution, and scene complexity.

## 6. Current Development Stage

The current development focuses on:

- Webcam integration.
- Real-time hand landmark detection.
- Two-hand detection.
- Rigged anatomical hand visualization.
- Finger movement retargeting.
- Palm position and orientation tracking.

The complete gesture-controlled vehicle disassembly and reassembly workflow is a planned development objective, not yet a completed feature.

## 7. Planned System Expansion

Future development is expected to introduce:

- Gesture recognition for vehicle interaction.
- Selection of individual vehicle components.
- Component translation and rotation.
- Interactive vehicle disassembly.
- Component reassembly.
- Support for different vehicle types.

## 8. Technology Overview

| Component | Technology |
|---|---|
| Programming language | JavaScript |
| Computer vision | MediaPipe Tasks Vision |
| 3D graphics | Three.js |
| 3D asset format | GLB / glTF |
| Frontend | HTML and CSS |
| Development server | Vite |
| Version control | Git and GitHub |

---

*MorphDrive 3D — Natural hand interaction for 3D vehicle exploration.*
