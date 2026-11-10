# MorphDrive 3D — System Architecture

## 1. Introduction

MorphDrive 3D is an interactive computer vision and 3D graphics project designed to translate natural hand movements into real-time interactions within a 3D vehicle environment.

The application uses a webcam to capture hand movements, MediaPipe to detect and track hand landmarks, and Three.js to visualize and manipulate 3D objects.

The architecture is designed to support future interaction features, including vehicle component selection, disassembly, manipulation, and reassembly.

## 2. System Components

### 2.1 Computer Vision — MediaPipe

MediaPipe Tasks Vision provides real-time hand landmark detection and tracking.

The hand landmarker identifies 21 landmarks for each detected hand:

- Wrist
- Thumb joints
- Index finger joints
- Middle finger joints
- Ring finger joints
- Pinky finger joints

The system is configured to detect up to two hands simultaneously.

The detected landmarks provide the positional and structural information needed to calculate hand movement and drive the 3D hand visualization.

### 2.2 3D Rendering — Three.js

Three.js manages the application's interactive 3D environment.

Its responsibilities include:

- Creating and managing the 3D scene.
- Configuring the camera and renderer.
- Loading 3D models in GLB format.
- Displaying the anatomical hand model.
- Updating object positions and rotations.
- Rendering the scene continuously.

### 2.3 3D Hand Model

The project uses a rigged GLB hand model containing a skeletal structure with 21 bones corresponding to the anatomical hand structure.

MediaPipe hand landmarks provide the tracking data used to calculate finger directions and update the corresponding 3D bone transformations.

This process connects the detected hand movement to the animated 3D hand model.

### 2.4 Vehicle Models

Vehicle models are loaded as GLB assets and displayed within the Three.js environment.

The initial vehicle asset is a generic sedan. The architecture is intended to accommodate additional vehicle models as development progresses.

## 3. Processing Pipeline

The hand-tracking and visualization pipeline follows these stages:

1. Capture video frames from the webcam.
2. Pass the frames to the MediaPipe hand landmarker.
3. Detect hand landmarks and handedness.
4. Retrieve normalized image landmarks and 3D world landmarks.
5. Convert landmark coordinates into the application's Three.js coordinate system.
6. Calculate palm position and orientation.
7. Map finger landmark directions to the rigged hand skeleton.
8. Update the 3D hand transformations.
9. Render the updated scene.

This pipeline connects webcam input, computer vision processing, 3D transformation calculations, and real-time visualization.

## 4. Coordinate Systems

MediaPipe provides two landmark representations used by the application.

### 4.1 Image Landmarks

Image landmarks contain normalized coordinates describing the position of each hand landmark within the camera image.

They are useful for determining hand position relative to the camera view and mapping detected movement into the 3D environment.

### 4.2 World Landmarks

World landmarks provide three-dimensional coordinates describing the spatial structure of the detected hand.

They are useful for estimating palm orientation, finger directions, and the relative spatial arrangement of hand landmarks.

### 4.3 Coordinate Conversion

The application converts the detected landmark coordinates into a consistent Three.js coordinate convention before applying transformations to the 3D hand model.

This conversion is important because the coordinate representations used by computer vision and 3D rendering systems are not necessarily identical.

## 5. Performance Considerations

MorphDrive 3D is designed with accessible hardware in mind, including computers with integrated graphics.

The main performance considerations include:

- Limiting the renderer's pixel ratio.
- Disabling unnecessary antialiasing.
- Controlling hand detection frequency.
- Avoiding duplicate video-frame processing.
- Reusing Three.js objects and temporary vectors.
- Applying smoothing to reduce sudden movement.
- Keeping the 3D scene and loaded assets lightweight.

Actual performance depends on the device, browser, camera resolution, tracking workload, and scene complexity.

## 6. Current Development Stage

Current development focuses on establishing the core computer vision and 3D visualization functionality.

The current development areas include:

- Webcam integration.
- Real-time hand landmark detection.
- Two-hand detection.
- Rigged anatomical hand visualization.
- Finger movement retargeting.
- Palm position and orientation tracking.

The complete gesture-controlled vehicle disassembly and reassembly workflow remains a planned development objective.

## 7. Planned System Expansion

Future development is expected to extend the system with:

- Gesture recognition for vehicle interaction.
- Selection of individual vehicle components.
- Component translation and rotation.
- Interactive vehicle disassembly.
- Component reassembly.
- Support for different vehicle types.

These additions will build upon the existing hand-tracking and 3D rendering architecture.

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

*MorphDrive 3D — Bringing natural hand interaction into 3D vehicle exploration.*