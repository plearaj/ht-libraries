# Data Model: ht-camera-upload

**Branch**: `001-camera-upload` | **Date**: 2026-02-18
**Source**: `specs/001-camera-upload/spec.md` (Key Entities) + research.md

No persistent data store is involved. All data is held in memory during a user session
and passed between the library and the consuming application via observables and outputs.

---

## Entity: CapturedImage

The image data produced by either the camera or file picker. This is the canonical
output of both services, replacing the service-specific `FileUploadResult` and
`CapacitorPhotoResult` shapes with a unified interface.

```typescript
interface CapturedImage {
  /** Raw File object (browser path) or a synthetic File from base64 (Capacitor path) */
  file: File;
  /** Data URL for immediate preview (always populated) */
  dataUrl: string;
  /** Pixel width after any resizing; undefined if not processed */
  width?: number;
  /** Pixel height after any resizing; undefined if not processed */
  height?: number;
  /** MIME type, e.g. 'image/jpeg' */
  mimeType: string;
  /** Source that produced the image */
  source: 'camera' | 'file' | 'gallery';
}
```

**Validation rules**:
- `file` MUST be present and non-null
- `dataUrl` MUST be a valid base64 data URL (`data:image/...;base64,...`)
- `mimeType` MUST be one of: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- `source` is informational; does not affect downstream processing

**State transitions**:
```
[none] → captured (camera or file picker confirms) → previewed → uploaded | cancelled
```

---

## Entity: UploadConfig\<T\>

Settings provided by the consuming app when it wants to trigger a remote upload.
The library does not prescribe a specific backend — the consumer supplies the handler.

```typescript
interface UploadConfig<T> {
  /** Consumer-supplied function that performs the actual upload.
   *  Receives the CapturedImage and returns a stream of progress/result events. */
  handler: UploadHandler<T>;
  /** Maximum file size in bytes; library rejects before calling handler if exceeded */
  maxSizeBytes?: number;
  /** Allowed MIME types; library rejects before calling handler if not matched */
  allowedTypes?: string[];
}

type UploadHandler<T> = (image: CapturedImage) => Observable<UploadProgress | UploadResult<T>>;
```

**Validation rules**:
- `handler` MUST be a function; cannot be null/undefined
- If `maxSizeBytes` is set, images exceeding the limit produce an error before the
  handler is called — zero bytes are sent to the backend
- If `allowedTypes` is set, unmatched MIME types produce an error before the handler
  is called

---

## Entity: UploadProgress

An intermediate event emitted by the upload handler observable indicating transfer progress.

```typescript
interface UploadProgress {
  type: 'progress';
  /** 0–100 */
  percent: number;
  /** Bytes transferred so far */
  bytesTransferred: number;
  /** Total bytes to transfer */
  totalBytes: number;
}
```

**Notes**: At least one `UploadProgress` event MUST be emitted before completion (SC-004).

---

## Entity: UploadResult\<T\>

The terminal event emitted by the upload handler observable indicating success or failure.

```typescript
interface UploadResult<T> {
  type: 'complete';
  /** The remote reference returned by the backend (URL, path, ID, etc.) */
  ref: T;
}
```

On failure the observable errors; the `CapturedImage` remains available in the
component for retry.

---

## Entity: CameraUploadOptions (existing — refined)

Options passed to the services for capture/processing behaviour.

```typescript
interface CameraUploadOptions {
  /** Max width in pixels for resize (optional, opt-in) */
  maxWidth?: number;
  /** Max height in pixels for resize (optional, opt-in) */
  maxHeight?: number;
  /** JPEG/WebP quality 0–1 (optional, opt-in) */
  quality?: number;
  /** Output format after processing (optional) */
  outputFormat?: 'image/jpeg' | 'image/png' | 'image/webp';
  // Note: allowMultiple is retained in the existing interface but MUST NOT be
  // surfaced in the HtCameraUpload component (spec: single-image per interaction)
}
```

---

## Relationship Summary

```
Consumer App
    │
    │ provides UploadConfig<T>
    ▼
HtCameraUpload (component)
    │
    │ delegates to (platform-detected)
    ├──► HtCameraUploadService    (browser)
    │        └── produces CapturedImage
    └──► HtCapacitorCameraService (native)
             └── produces CapturedImage
    │
    │ emits output events
    ├──► imageCaptured: CapturedImage
    ├──► uploadProgress: UploadProgress
    ├──► uploadComplete: UploadResult<T>
    └──► uploadError: Error
```
