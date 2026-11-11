# MorphDrive 3D — System Architecture

## 1. Introduction

MorphDrive 3D is an interactive computer vision and 3D graphics application that aims to translate natural hand movements into real-time interactions within a 3D vehicle environment.

The application combines webcam-based hand tracking, MediaPipe Tasks Vision, and Three.js to connect physical hand movements with interactive 3D visualizations.

The architecture separates computer vision processing, hand visualization, vehicle rendering, and user interaction to support future expansion.

The long-term objective is to allow users to explore, select, disassemble, manipulate, and reassemble 3D vehicle components using natural hand gestures.

## 2. System Components

### 2.1 Computer Vision — MediaPipe Tasks Vision

MediaPipe Tasks Vision provides the computer vision functionality responsible for detecting and tracking hands through the webcam.

The Hand Landmarker model identifies 21 landmarks for each detected hand, including:

- Wrist
- Thumb joints
- Index finger joints
- Middle finger joints
- Ring finger joints
- Pinky finger joints

The application is configured to detect up to two hands simultaneously.

MediaPipe provides two important types of landmark information:

- **Image landmarks:** Normalized landmark positions relative to the camera image.
- **World landmarks:** Three-dimensional landmark coordinates representing the spatial structure of the hand.

These results provide the positional and structural information required for hand tracking, orientation calculations, and 3D hand visualization.

### 2.2 3D Rendering — Three.js

Three.js manages the application's interactive 3D environment and rendering pipeline.

Its responsibilities include:

- Creating and managing the 3D scene.
- Configuring the camera, renderer, and lighting.
- Loading and displaying GLB/glTF models.
- Rendering the anatomical hand model.
- Managing vehicle model transformations.
- Supporting viewport navigation and interaction.
- Updating and rendering the scene continuously.

Three.js also provides raycasting functionality for detecting interactions between the user's pointer and 3D objects.

### 2.3 3D Hand Model

MorphDrive 3D uses a rigged GLB hand model containing a skeletal structure with 21 bones corresponding to the anatomical hand structure.

The hand model is loaded into the Three.js scene and animated using transformation data calculated from MediaPipe landmarks.

The hand visualization process involves:

1. Receiving detected hand landmarks.
2. Calculating relevant finger directions and palm orientation.
3. Mapping tracking information to the hand model's skeletal structure.
4. Updating the corresponding bone transformations.
5. Rendering the animated hand in the 3D environment.

This approach connects computer vision tracking data with a three-dimensional anatomical hand representation.

### 2.4 Vehicle Models

Vehicle models are imported as GLB assets and displayed within the Three.js environment.

The initial vehicle asset is a generic sedan.

The application supports vehicle visualization and appearance customization, while its architecture is intended to accommodate additional vehicle types and more advanced component-level interactions.

Future vehicle management functionality will provide a more organized approach to loading, switching, and managing multiple vehicle models.

## 3. System Processing Pipeline

The application combines webcam input, computer vision processing, 3D transformation calculations, and real-time rendering.

### 3.1 Hand Tracking Pipeline

The hand-tracking process follows these stages:

1. Capture video frames from the webcam.
2. Pass the frames to the MediaPipe Hand Landmarker.
3. Detect hands and estimate their handedness.
4. Retrieve normalized image landmarks and 3D world landmarks.
5. Convert the relevant landmark coordinates into the application's coordinate conventions.
6. Calculate palm position, orientation, and finger directions.
7. Map the tracking information to the rigged 3D hand model.
8. Update the corresponding hand transformations.
9. Render the updated scene.

### 3.2 3D Interaction Pipeline

The 3D interaction system uses tracking and pointer information to support interaction with objects in the viewport.

The current interaction architecture includes:

- Mouse-based viewport interaction.
- Raycasting for detecting objects under the pointer.
- Tracked fingertip positions represented in Three.js normalized device coordinates.
- Tracked hand positions represented in the application's 3D coordinate system.
- Hover feedback for supported vehicle interactions.

These interfaces provide a foundation for future gesture-controlled vehicle component selection and manipulation.

## 4. Coordinate Systems

MediaPipe and Three.js use different coordinate conventions. Therefore, landmark data must be interpreted and converted appropriately before being applied to 3D objects.

### 4.1 Image Landmarks

Image landmarks contain normalized coordinates describing the position of each hand landmark within the camera image.

They are useful for:

- Determining hand position relative to the camera view.
- Tracking fingertip movement.
- Mapping detected hand positions into the interactive viewport.

### 4.2 World Landmarks

World landmarks provide three-dimensional coordinates describing the spatial structure of the detected hand.

They are useful for:

- Estimating palm orientation.
- Calculating finger directions.
- Understanding the relative positions of hand joints.
- Driving the 3D hand visualization.

### 4.3 Coordinate Conversion

The application converts and interprets landmark coordinates before applying them to the Three.js scene.

This process accounts for differences between the coordinate systems used by computer vision and 3D rendering.

Correct coordinate conversion is particularly important for maintaining consistent hand orientation, movement, and interaction behavior.

## 5. Performance and Resource Management

MorphDrive 3D is designed to operate on accessible hardware, including computers with integrated graphics.

Performance optimization is important because webcam processing and real-time 3D rendering run within the same application.

The main optimization strategies include:

- Limiting the renderer's pixel ratio to reduce rendering workload.
- Using low-power rendering preferences where supported.
- Controlling hand detection frequency.
- Avoiding unnecessary duplicate video-frame processing.
- Reusing Three.js objects and temporary mathematical structures.
- Applying smoothing to reduce sudden tracking movements.
- Limiting unnecessary raycasting operations.
- Disposing of unused geometries, materials, and textures.
- Keeping 3D models and scene complexity manageable.

Actual performance depends on hardware capabilities, browser implementation, camera resolution, tracking frequency, and scene complexity.

## 6. Current Development Stage

The current development focuses on establishing the core computer vision, hand visualization, and interactive 3D vehicle-viewing functionality.

The implemented development areas include:

- Webcam integration.
- MediaPipe hand landmark detection.
- Configuration for detecting up to two hands.
- Rigged anatomical hand model integration.
- Hand position and orientation processing.
- Finger movement retargeting.
- Interactive 3D vehicle visualization.
- Vehicle appearance customization.
- Mouse-based viewport navigation.
- Pointer and tracked-hand hover interaction.

Hand tracking and gesture interaction are still under active development. Detection configuration does not necessarily guarantee stable simultaneous tracking under all conditions.

The complete gesture-controlled vehicle disassembly and reassembly workflow remains a future development objective.

## 7. Planned System Expansion

Future development will extend the existing architecture with additional vehicle and gesture-interaction capabilities.

### 7.1 Multi-Vehicle Management

- Support for different vehicle types.
- Dynamic vehicle model loading.
- Switching between available vehicles.
- Model resource management.

### 7.2 Vehicle Component Interaction

- Individual vehicle component selection.
- Component highlighting.
- Component translation and rotation.
- Interactive exploded-view visualization.

### 7.3 Gesture Recognition

- Pinch and grab gesture recognition.
- Gesture-based component selection.
- Hand-controlled component movement.
- Two-hand interaction.
- Gesture-based release and confirmation.

### 7.4 Disassembly and Reassembly

- Interactive separation of vehicle components.
- Independent component manipulation.
- Component position validation.
- Automatic component snapping.
- Guided vehicle reassembly.

These additions will build upon the existing computer vision and 3D rendering architecture.

## 8. Technology Overview

| Component | Technology |
|---|---|
| Programming language | JavaScript |
| Computer vision | MediaPipe Tasks Vision |
| 3D graphics | Three.js |
| 3D asset format | GLB / glTF |
| Frontend | HTML, CSS, JavaScript |
| Development server | Vite |
| Version control | Git and GitHub |

---

*MorphDrive 3D — Bringing natural hand interaction into 3D vehicle exploration.*