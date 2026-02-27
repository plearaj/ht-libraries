# Research: ht-camera-upload

**Branch**: `001-camera-upload` | **Date**: 2026-02-18
**Phase**: 0 — Resolve unknowns from Technical Context

No NEEDS CLARIFICATION markers existed in the Technical Context — all decisions were
resolved from the existing codebase and spec. This document records the key architectural
decisions and alternatives evaluated.

---

## Decision 1: Two-Service Architecture (Browser + Capacitor)

**Decision**: Retain the existing two-service split:
- `HtCameraUploadService` — browser-based image handling via `input[type=file][capture]`
  and the Canvas/FileReader APIs. Works in any modern browser with no native plugins.
- `HtCapacitorCameraService` — native camera via `@capacitor/camera`. Works on iOS/Android
  via Capacitor runtime; falls back gracefully on web (Capacitor web implementation uses
  `input[type=file]` internally).

**Rationale**: The two APIs are fundamentally different at the platform level. Merging
them into a single service would require branching on platform detection inside one class,
increasing complexity. Keeping them separate makes each independently testable and
replaceable.

**Alternatives considered**:
- Single unified service with platform detection: Rejected — violates KISS; harder to
  test browser path in isolation from Capacitor path.
- Capacitor-only (drop browser service): Rejected — Capacitor's web implementation on
  desktop browser does not support `input[capture]`; having the explicit browser service
  gives developers a known-good fallback.

---

## Decision 2: Component Design — Platform-Aware Trigger

**Decision**: The `HtCameraUpload` component will detect at initialization whether the
app is running on a native Capacitor platform (`window.Capacitor?.isNativePlatform()`).
- On native: delegates to `HtCapacitorCameraService` using `CameraSource.Prompt` to
  show the native camera/gallery picker.
- On browser: delegates to `HtCameraUploadService` — camera option uses
  `input[capture="environment"]`, file option uses plain `input[type=file]`.

The component exposes a single trigger — the platform selection is transparent to the
consumer. A signal `isNative` drives the template with `@if`.

**Rationale**: The consuming developer should not need to know or care which service
is active. The component chooses the right path automatically based on runtime platform.

**Alternatives considered**:
- Expose both services directly with no component: Rejected — each consuming app would
  repeat the same platform-detection logic (DRY violation).
- Let the consumer choose the service manually via an input: Rejected — adds unnecessary
  API surface (YAGNI); the runtime detection is sufficient.

---

## Decision 3: Upload Pipeline — Consumer-Supplied Handler

**Decision**: The library does NOT implement a specific upload transport. Instead,
the `HtCameraUploadService` exposes an `upload` method that accepts:
- The `CapturedImage` data object
- An `UploadHandler<T>` — a function provided by the consuming app that takes the
  image data and returns an `Observable<UploadProgress | UploadResult<T>>`

The component observes this stream and emits typed output events.

**Rationale**: The spec explicitly states the upload destination is a host-app concern.
Firebase Storage, REST endpoints, and S3 presigned URLs all have different transport
mechanisms. A pluggable handler avoids coupling the library to any backend.

**Alternatives considered**:
- Built-in Firebase Storage upload support: Rejected — adds a large dependency and
  duplicates what `ht-quick-ngxfire` already provides; violates YAGNI for apps that
  don't use Firebase.
- Emit the raw `File` and let the consumer handle upload entirely: Considered — simpler,
  but loses the benefit of observable progress tracking that the spec requires (FR-006).
  The handler pattern preserves this while staying backend-agnostic.

---

## Decision 4: Shared Types — `types.ts` Central File

**Decision**: Create `projects/ht-camera-upload/src/lib/types.ts` containing shared
interfaces: `CapturedImage`, `UploadConfig<T>`, `UploadProgress`, `UploadResult<T>`,
`UploadHandler<T>`. Export all from `public-api.ts`.

**Rationale**: Both services and the component reference the same image and upload
types. Without a central file, each file would define or re-import types — a DRY
violation. The existing services already have `FileUploadResult` and `CapacitorPhotoResult`
with overlapping shapes; they will be aligned to `CapturedImage` as a common output type.

**Alternatives considered**:
- Keep types in each service file: Rejected — leads to duplication and makes consumers
  import from deep paths rather than a clean public API.

---

## Decision 5: Image Compression — Optional, Opt-In

**Decision**: Image compression and resizing (already implemented in `HtCameraUploadService`)
remain opt-in via `CameraUploadOptions`. The component does not compress by default.
For the Capacitor path, Capacitor's built-in `quality` parameter is used.

**Rationale**: The spec states "if not configured, the image is uploaded as-is." Default
compression would silently degrade image quality — a bad default. Opt-in is correct.

---

## Decision 6: Camera Availability Detection

**Decision**: On browser: check `navigator.mediaDevices && navigator.mediaDevices.getUserMedia`.
On Capacitor web: check `Camera.checkPermissions()`. The component shows/hides the
camera option reactively using a computed signal based on the availability check.

**Rationale**: Availability must be checked at runtime, not compile time. A signal-based
check integrates cleanly with `OnPush` change detection without manual `markForCheck()`.

---

## All NEEDS CLARIFICATION: Resolved

No open questions remain. All Technical Context fields are fully resolved from existing
code inspection and spec review.
