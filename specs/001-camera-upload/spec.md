# Feature Specification: ht-camera-upload

**Feature Branch**: `001-camera-upload`
**Created**: 2026-02-18
**Status**: Draft
**Input**: Reusable Ionic Angular component and service for uploading images from a
file picker or the device camera

## Clarifications

### Session 2026-02-18

- Q: When no `maxSizeBytes` is configured by the host, what should the component do with a very large image? → A: No default limit — images of any size pass through; size enforcement is entirely the host app's responsibility via `maxSizeBytes`.
- Q: When camera is unavailable, should the camera option be absent or disabled with a message? → A: Disabled with message — the camera button renders but is visually disabled with a short inline explanation (e.g., "Camera unavailable").
- Q: When an upload fails mid-transfer, how is the retry triggered? → A: Manual — the library emits the error and preserves the image in state; no retry logic inside the library. The user taps Upload again to retry.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Select and Preview an Image from the Device Camera (Priority: P1)

A user in an Ionic Angular app taps an upload button. A prompt appears offering camera
or file options. They choose camera, the device camera opens, they take a photo, and a
preview of the captured image appears immediately in the app. The image is ready for
upload or further processing by the host application.

**Why this priority**: Camera capture is the primary differentiator of this library
over a plain file input. If native camera access does not work, the library's name and
purpose are unfulfilled.

**Independent Test**: On a device with a camera, tapping the trigger button and selecting
"Camera" opens the camera, captures a photo, and displays a thumbnail preview in the
component. Testable independently of file picker and upload features.

**Acceptance Scenarios**:

1. **Given** the component is placed in an Ionic Angular app on a device with a camera,
   **When** a user taps the upload trigger and selects "Camera", **Then** the native
   camera opens.
2. **Given** the camera is open, **When** the user takes a photo and confirms it,
   **Then** a preview thumbnail of the captured image appears in the component within
   1 second.
3. **Given** an image is previewed, **When** the host application requests the image,
   **Then** the service exposes the captured image as a file or data object ready for
   upload.

---

### User Story 2 - Select and Preview an Image from the File System (Priority: P2)

A user on a device without a camera, or who prefers to upload an existing photo, taps
the upload trigger and selects a file from the device's file system. A preview of the
selected image appears and the image is available to the host application for upload.

**Why this priority**: File picker is the universal fallback and the only path available
in browser environments without camera hardware. Without it, the component is unusable
on desktops and camera-denied scenarios.

**Independent Test**: On any platform, tapping the trigger and selecting "File" opens
the OS file picker; selecting an image file displays a preview in the component.
Independently testable without a physical camera.

**Acceptance Scenarios**:

1. **Given** the component is in an Ionic Angular app, **When** a user taps the upload
   trigger and selects "File", **Then** the native OS file picker opens filtered to
   image types.
2. **Given** the file picker is open, **When** the user selects a valid image file,
   **Then** a preview thumbnail appears in the component within 1 second of selection.
3. **Given** an image is selected via file picker, **When** the host application
   requests the image, **Then** the service exposes it as a file or data object
   consistent with the camera-capture output format.

---

### User Story 3 - Upload the Selected Image to a Remote Destination (Priority: P3)

After selecting or capturing an image, the user confirms the upload. The service sends
the image to a remote storage destination configured by the host application and reports
progress and completion status back to the component so the UI can show feedback.

**Why this priority**: The upload step is what gives "camera-upload" its name. Without
it, the library stops at preview — still useful, but incomplete relative to its stated
purpose.

**Independent Test**: Given a selected image and a configured upload destination, calling
the upload method causes the image to appear at the remote destination and the service
emits a completion event. Testable without the camera or file picker (supply a test image
programmatically).

**Acceptance Scenarios**:

1. **Given** an image is selected and an upload destination is configured, **When** the
   host application calls the upload method, **Then** the image is sent to the configured
   destination.
2. **Given** an upload is in progress, **When** the component is observing upload state,
   **Then** it receives progress updates (e.g., percentage complete) that can be reflected
   in the UI.
3. **Given** the upload completes successfully, **When** the component observes the result,
   **Then** it receives a success event containing the uploaded file's reference or URL.
4. **Given** the upload fails (network error, permission denied), **When** the component
   observes the result, **Then** it receives a descriptive error event, the image
   remains in preview state, and the user may tap Upload again to retry manually.

---

### User Story 4 - Degrade Gracefully When Camera Is Unavailable (Priority: P4)

A user opens the app in a browser environment where the device camera is not accessible
(desktop browser, camera permission denied, or no camera hardware). The component
renders the camera button in a visually disabled state with an inline explanation and
keeps the file picker fully functional — no broken or empty UI states.

**Why this priority**: The component must work correctly in every environment where
an Ionic Angular app can run, not just on mobile devices with camera access.

**Independent Test**: In a browser where camera access is denied or unavailable, the
component renders the camera button as disabled with an inline explanation (e.g.,
"Camera unavailable") and the file picker path works normally.

**Acceptance Scenarios**:

1. **Given** the component is in an environment with no camera or where camera
   permission has been denied, **When** the component renders, **Then** the camera
   button is visible but disabled with an inline message (e.g., "Camera unavailable")
   and the file picker button is fully functional.
2. **Given** camera permission is denied mid-session, **When** the error is detected,
   **Then** the component displays a readable message explaining why the camera is
   unavailable.

---

### Edge Cases

- What happens when the user cancels the camera or file picker without selecting an
  image? The component must return to its initial state with no error shown.
- What happens when the selected file is not a supported image type? The component must
  reject it with a clear message and not display a broken preview.
- What happens when the selected image is very large? If the host has configured
  `maxSizeBytes` in the Upload Configuration, the component rejects the image with a
  descriptive error before invoking the upload handler — no bytes are transferred. If
  `maxSizeBytes` is not set, the component imposes no size limit; the image passes
  through regardless of size. Size enforcement is the host app's responsibility.
- What happens when the upload is interrupted mid-transfer (network drops)? The service
  must emit an error event; the image must remain in the preview state so the user can
  retry manually by tapping Upload again. The library contains no automatic or
  configurable retry logic — retry is entirely the user's action.
- What happens when multiple images are selected? The component must either enforce a
  single-image limit or explicitly declare multi-image support as in-scope; this spec
  assumes single-image per interaction.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The library MUST provide a reusable component that, when placed in an Ionic
  Angular template, renders an upload trigger that opens a choice between camera capture
  and file selection.
- **FR-002**: The component MUST open the device's native camera when the camera option
  is selected, on platforms where camera access is available.
- **FR-003**: The component MUST open the OS file picker filtered to image file types
  when the file option is selected.
- **FR-004**: After an image is captured or selected, the component MUST display a
  preview thumbnail of that image.
- **FR-005**: The library MUST expose a service that provides the selected/captured image
  as a standard data object (file or binary equivalent) to the host application.
- **FR-006**: The service MUST provide an upload method that sends the image to a
  destination configured by the host application, and MUST emit progress and
  completion/failure events observable by the host.
- **FR-007**: When camera access is unavailable or permission is denied, the component
  MUST render the camera button in a visually disabled state with an inline explanation
  (e.g., "Camera unavailable"); the file picker MUST remain fully functional.
- **FR-008**: The component MUST handle user cancellation (closing the camera or file
  picker without a selection) by returning to its initial state with no error displayed.
- **FR-009**: The component MUST display a clear, human-readable message when an
  unsupported file type is selected.
- **FR-010**: The library MUST be independently buildable and publishable as an npm
  package; consuming apps MUST NOT need to configure Capacitor or Ionic Camera
  dependencies separately.

### Key Entities

- **Captured Image**: The image data produced by the camera or file picker; carries the
  binary content, file name, MIME type, and size; passed from the component to the
  host via the service.
- **Upload Configuration**: The settings provided by the host app to the service;
  specifies the remote destination and any optional constraints (max size, allowed types).
- **Upload Result**: The outcome of an upload attempt; carries success status, the
  remote reference or URL on success, or an error description on failure.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can capture a photo and see a preview within 2 seconds of confirming
  the photo in the camera.
- **SC-002**: A user can select a file and see a preview within 1 second of confirming
  the selection in the file picker.
- **SC-003**: The component renders the camera button disabled with an inline explanation
  on 100% of environments where camera access is unavailable — no broken or missing UI
  states, and the file picker remains functional in every such environment.
- **SC-004**: An image upload initiated by the service produces a progress event at
  least once before completion, enabling the host app to display a progress indicator.
- **SC-005**: A developer can add the component to an existing Ionic Angular app and have
  camera capture working in under 10 minutes following the library documentation.
- **SC-006**: The library builds independently with zero errors; consuming apps require
  no Capacitor plugin configuration beyond installing the library.

## Assumptions

- The library relies on Capacitor for native camera access on iOS and Android; Capacitor
  is bundled within the library so that consumers do not need to install it separately.
- Upload destination is provided by the consuming app at runtime (e.g., a Firebase
  Storage reference, a REST endpoint); the library does not prescribe a specific backend.
- Only single-image selection per interaction is supported in this spec; multi-image
  upload is out of scope.
- Image compression or resizing before upload is a configurable option, not a default
  behaviour; if not configured, the image is uploaded as-is.
- The component imposes no default maximum image size. If the host does not configure
  `maxSizeBytes`, images of any size are accepted and passed to the upload handler without
  size validation.
- The primary target platforms are iOS, Android (via Capacitor), and modern desktop
  browsers; older browsers without File API support are out of scope.
