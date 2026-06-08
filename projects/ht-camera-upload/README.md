# ht-camera-upload

Capture an image (browser camera, native Capacitor camera, file picker, or photo gallery) and hand it to a host-supplied uploader. The library normalizes every source to a single `CapturedImage` shape, optionally resizes/compresses on the browser path, and chooses the right capture API automatically based on whether the app is running in a Capacitor native runtime.

> AI-agent README: section headings and symbol names are stable. The library does **not** ship an upload implementation — you provide an `UploadHandler` that returns an `Observable<UploadProgress | UploadResult<T>>`. Pair this lib with `HtStorageService` from `ht-quick-ngxfire` (or any other backend) for end-to-end uploads.

---

## TL;DR for agents

- **One component, two services.** `<ht-camera-upload>` is the drop-in widget; `HtCameraUploadService` (browser) and `HtCapacitorCameraService` (native) are also injectable directly if you don't want the component's UI.
- **No `provideX` function.** Both services are `@Injectable({ providedIn: 'root' })`. Just import and inject.
- **You own the upload.** The library never makes a network call by itself. Pass an `UploadConfig<T>` whose `handler` produces an `Observable<UploadProgress | UploadResult<T>>`; the component subscribes and re-emits via outputs.
- **Native vs. browser is auto-detected** by checking `window.Capacitor?.isNativePlatform()`. The component picks `HtCapacitorCameraService` on native, `HtCameraUploadService` on web. You can call either service directly to force a path.
- **Allowed MIME types are a hard list.** The component rejects anything outside `image/jpeg | image/png | image/webp | image/gif` regardless of `UploadConfig.allowedTypes` (which is an additional filter on top).
- **Don't `npm install` inside `projects/ht-camera-upload/`** — install at the workspace root only (peer-dep / NG0203 trap).

---

## Install

```bash
# In the consuming app
npm install ht-camera-upload @capacitor/camera
# (Capacitor itself is needed for the native path — see https://capacitorjs.com/docs)
```

`package.json`:

```json
{
  "peerDependencies": {
    "@angular/common": "^21.2.0",
    "@angular/core": "^21.2.0"
  },
  "dependencies": {
    "@capacitor/camera": "^7.0.2"
  }
}
```

`@capacitor/camera` is bundled. On a pure-web project you can still import the module — it only calls Capacitor APIs after `window.Capacitor?.isNativePlatform()` returns `true`, so a non-Capacitor app safely no-ops on the native path.

For native platforms, follow the Capacitor camera plugin setup (manifest entries on Android, `Info.plist` permissions on iOS).

---

## Bootstrap

There is no provider function. Both services use `providedIn: 'root'`. Import the standalone component where you need it:

```typescript
import { Component } from '@angular/core';
import { HtCameraUpload } from 'ht-camera-upload';

@Component({
  selector: 'app-photo',
  imports: [HtCameraUpload],
  template: `
    <ht-camera-upload
      triggerLabel="Take Photo"
      [options]="{ maxWidth: 1600, quality: 0.85, outputFormat: 'image/jpeg' }"
      [uploadConfig]="uploadConfig"
      (imageCaptured)="onCaptured($event)"
      (uploadProgress)="onProgress($event)"
      (uploadComplete)="onDone($event)"
      (uploadError)="onError($event)" />
  `,
})
export class PhotoComponent { /* ... */ }
```

---

## Public API surface

Exported from `public-api.ts`:

**Types** (`./lib/types`)
- `CapturedImage` — normalized output shape across all capture sources
- `UploadProgress` — `{ type: 'progress'; percent; bytesTransferred; totalBytes }`
- `UploadResult<T>` — `{ type: 'complete'; ref: T }` (T = whatever your handler returns)
- `UploadHandler<T>` — `(image: CapturedImage) => Observable<UploadProgress | UploadResult<T>>`
- `UploadConfig<T>` — `{ handler; maxSizeBytes?; allowedTypes? }`

**Services**
- `HtCameraUploadService` — browser capture (`<input type="file" capture>` + canvas resize)
- `HtCapacitorCameraService` — native Capacitor capture
- `CameraUploadOptions` — knobs for the browser service
- `CapacitorPhotoOptions` — knobs for the native service

**Component**
- `HtCameraUpload` (selector `ht-camera-upload`) — drop-in capture + upload UI

---

## `CapturedImage` (the universal shape)

```typescript
interface CapturedImage {
  file: File;            // real File (browser) or synthetic File from base64 (native)
  dataUrl: string;       // always populated, ready for <img [src]>
  width?: number;        // populated only after resize/compress
  height?: number;       // populated only after resize/compress
  mimeType: string;      // 'image/jpeg' etc.
  source: 'camera' | 'file' | 'gallery';
}
```

This is what every capture method resolves to and what every uploader receives. The `file` property is always a real `File` so it works with `FormData`, Firebase Storage, fetch, etc.

---

## `HtCameraUploadService` (browser)

Source: `src/lib/ht-camera-upload.service.ts`. `@Injectable({ providedIn: 'root' })`.

| Member | Signature | Notes |
|--------|-----------|-------|
| `isCameraSupported` | `Signal<boolean>` | Probes `navigator.mediaDevices.getUserMedia` once at construction. |
| `takePhoto(options?)` | `(CameraUploadOptions) => Observable<CapturedImage>` | Opens an `<input type="file" accept="image/*" capture="environment">`. `source: 'camera'`. |
| `selectImage(options?)` | `(CameraUploadOptions) => Observable<CapturedImage>` | Opens `<input type="file" accept="image/*">`. `source: 'file'`. |
| `upload(image, config)` | `(CapturedImage, UploadConfig<T>) => Observable<UploadProgress \| UploadResult<T>>` | Thin pass-through to `config.handler(image)`. Validation is done by the component, not the service. |
| `dataUrlToFile(dataUrl, filename)` | `(string, string) => File` | Utility — synthesize a `File` from a data URL. |

### `CameraUploadOptions`

```typescript
interface CameraUploadOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;                                 // 0–1 for JPEG/WebP
  outputFormat?: 'image/jpeg' | 'image/png' | 'image/webp';
  allowMultiple?: boolean;                           // accepted but unused by the component
}
```

If **any** of `maxWidth / maxHeight / quality / outputFormat` is set, the service draws the source image into an offscreen canvas, resizes proportionally to fit within bounds, then re-encodes via `canvas.toBlob`. Defaults when reencoding: `quality = 0.9`, `outputFormat = 'image/jpeg'`. The resulting `File` is named `image.<ext>` and the `width` / `height` fields on `CapturedImage` are populated.

If none of those options is set, the original file is returned untouched (no canvas round-trip, no quality loss).

---

## `HtCapacitorCameraService` (native)

Source: `src/lib/ht-capacitor-camera.service.ts`. `@Injectable({ providedIn: 'root' })`. Always requests `resultType: DataUrl` from the Capacitor plugin so the result can be normalized to `CapturedImage`.

| Member | Signature | Notes |
|--------|-----------|-------|
| `isNativePlatform` | `Signal<boolean>` | `window.Capacitor?.isNativePlatform()` at construction. |
| `takePhoto(options?)` | `(CapacitorPhotoOptions) => Observable<CapturedImage>` | `source: 'camera'`, rear camera by default. |
| `pickFromGallery(options?)` | `(CapacitorPhotoOptions) => Observable<CapturedImage>` | `source: 'gallery'`. |
| `promptCameraOrGallery(options?)` | `(CapacitorPhotoOptions) => Observable<CapturedImage>` | Native action sheet that lets the user pick. `source: 'camera'`. |
| `requestPermissions()` | `() => Promise<{ camera: boolean; photos: boolean }>` | Triggers the native permission prompt. |
| `checkPermissions()` | `() => Promise<{ camera: boolean; photos: boolean }>` | No prompt. |
| `upload(image, config)` | `(CapturedImage, UploadConfig<T>) => Observable<UploadProgress \| UploadResult<T>>` | Pass-through to `config.handler(image)`. |

### `CapacitorPhotoOptions`

```typescript
interface CapacitorPhotoOptions {
  quality?: number;                                  // 0–100 (Capacitor's scale, NOT 0–1)
  width?: number;
  height?: number;
  allowEditing?: boolean;
  resultType?: 'uri' | 'base64' | 'dataUrl';         // accepted but ignored — always DataUrl
  saveToGallery?: boolean;
  correctOrientation?: boolean;                      // default true
  source?: 'camera' | 'photos' | 'prompt';
  direction?: 'rear' | 'front';                      // default 'rear'
}
```

> **Quality scale gotcha**: the browser service uses `0–1`, the Capacitor service uses `0–100`. The component passes `options` straight through to whichever service is active, so if you author one `options` blob for both runtimes pick a value that's safe in both (e.g. accept the defaults).

---

## `<ht-camera-upload>` (drop-in widget)

Source: `src/lib/ht-camera-upload.ts`. Standalone, `OnPush`, signal-based. Picks the right service for the current runtime via the `isNative` signal.

### Inputs

| Input | Type | Default | Behavior |
|-------|------|---------|----------|
| `options` | `CameraUploadOptions` | `{}` | Passed to the **browser** service. (Native ignores; pass `CapacitorPhotoOptions` directly to `HtCapacitorCameraService` if you need native-side resize.) |
| `uploadConfig` | `UploadConfig<unknown> \| undefined` | `undefined` | When provided, an "Upload" button appears after capture. |
| `triggerLabel` | `string` | `'Add Photo'` | Text on the camera button. |

### Outputs

| Output | Type | When |
|--------|------|------|
| `imageCaptured` | `CapturedImage` | After a successful capture (camera or file/gallery). |
| `uploadProgress` | `UploadProgress` | For each `'progress'` event from the upload handler. |
| `uploadComplete` | `UploadResult<unknown>` | On the handler's `'complete'` event. |
| `uploadError` | `Error` | Capture or upload failures (cancellations are swallowed). |

### Internal state signals

| Signal | Type | Notes |
|--------|------|-------|
| `isNative` | `boolean` | Probed at construction (SSR-safe — checks `typeof window`). |
| `cameraAvailable` | `boolean` | Updated in `ngOnInit`: native → `checkPermissions().camera`; web → `browserService.isCameraSupported()`. |
| `currentImage` | `CapturedImage \| null` | Most recent capture. |
| `uploadState` | `'idle' \| 'uploading' \| 'complete' \| 'error'` | Drives button disable + status text. |

### Behavior

1. **Camera button** — disabled (with "Camera unavailable" label) when `cameraAvailable()` is false. On click: native → `promptCameraOrGallery()`; web → `takePhoto(options)`.
2. **"Choose File" button** — always enabled. Native → `pickFromGallery()`; web → `selectImage(options)`.
3. After capture, the image is passed through `ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']`. Anything else emits `uploadError` and is dropped.
4. **Upload button** appears only when `currentImage()` and `uploadConfig()` are both present. On click:
   - Reject early if `image.file.size > maxSizeBytes` → `uploadError`, no handler call.
   - Reject early if `image.mimeType ∉ allowedTypes` (if provided) → `uploadError`, no handler call.
   - Otherwise call `handler(image)` and forward `progress` / `complete` events to outputs.
5. Capture errors are checked against a small substring whitelist (`'User cancelled'`, `'cancelled photos app'`, `'No file selected'`, `'canceled'`) — those count as user cancellations and are silently dropped. Anything else is re-emitted as `uploadError`.

---

## Writing an `UploadHandler`

The handler is your pluggable backend. Return an `Observable` that emits zero-or-more `'progress'` events and exactly one `'complete'` event.

### Firebase Storage (paired with `ht-quick-ngxfire`)

```typescript
import { Component, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HtCameraUpload, UploadConfig, UploadHandler, UploadProgress, UploadResult, CapturedImage } from 'ht-camera-upload';
import { HtStorageService } from 'ht-quick-ngxfire';

@Component({
  selector: 'app-receipt',
  imports: [HtCameraUpload],
  template: `<ht-camera-upload [uploadConfig]="cfg" />`,
})
export class ReceiptComponent {
  private storage = inject(HtStorageService);

  private handler: UploadHandler<string> = (image: CapturedImage) =>
    new Observable<UploadProgress | UploadResult<string>>(subscriber => {
      const path = `receipts/${Date.now()}-${image.file.name}`;
      const task = this.storage.uploadFileResumable(path, image.file, { contentType: image.mimeType });

      task.on(
        'state_changed',
        snap => subscriber.next({
          type: 'progress',
          percent: (snap.bytesTransferred / snap.totalBytes) * 100,
          bytesTransferred: snap.bytesTransferred,
          totalBytes: snap.totalBytes,
        }),
        err => subscriber.error(err),
        async () => {
          const url = await this.storage.getDownloadURLAsync(path);
          subscriber.next({ type: 'complete', ref: url });
          subscriber.complete();
        },
      );
      return () => { /* cancel hook if your backend supports it */ };
    });

  cfg: UploadConfig<string> = {
    handler: this.handler,
    maxSizeBytes: 10 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/webp'],
  };
}
```

### Plain `XMLHttpRequest` (so you get progress)

```typescript
const handler: UploadHandler<string> = image =>
  new Observable<UploadProgress | UploadResult<string>>(subscriber => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) {
        subscriber.next({
          type: 'progress',
          percent: (e.loaded / e.total) * 100,
          bytesTransferred: e.loaded,
          totalBytes: e.total,
        });
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        subscriber.next({ type: 'complete', ref: xhr.responseText });
        subscriber.complete();
      } else {
        subscriber.error(new Error(`Upload failed: ${xhr.status}`));
      }
    };
    xhr.onerror = () => subscriber.error(new Error('Network error'));

    const fd = new FormData();
    fd.append('file', image.file);
    xhr.open('POST', '/api/uploads');
    xhr.send(fd);

    return () => xhr.abort();
  });
```

`fetch()` doesn't expose upload progress — use `XMLHttpRequest` or a streaming-aware client when you need it.

---

## Recipes

### Use the services directly without the component

```typescript
const browser = inject(HtCameraUploadService);
browser.takePhoto({ maxWidth: 1024, quality: 0.8, outputFormat: 'image/webp' })
  .subscribe(image => /* image is a CapturedImage */);
```

### Force the native code path even on web (rarely useful — for testing)

```typescript
inject(HtCapacitorCameraService).takePhoto().subscribe(/* ... */);
// On web this rejects because `Camera.getPhoto` is not implemented; check `isNativePlatform()` first.
```

### Just resize a `File` you already have (no UI)

```typescript
const dataUrl = await /* new FileReader().readAsDataURL(file) */;
const file = inject(HtCameraUploadService).dataUrlToFile(dataUrl, 'receipt.jpg');
// Use `file` with FormData or your storage SDK.
```

### Preflight permissions on iOS/Android before showing the button

```typescript
const cap = inject(HtCapacitorCameraService);
const { camera, photos } = await cap.checkPermissions();
if (!camera) await cap.requestPermissions();
```

---

## Notes for AI agents extending this library

1. **`CapturedImage` is the contract.** Any new capture source you add must return one of these. `file` must always be a real `File` (synthesize from a data URL via the existing `dataUrlToFile` helper if needed).
2. **Don't make the library upload anything.** The split between "capture/normalize" and "upload" is intentional — `UploadHandler` keeps the lib small and storage-agnostic. If you want a Firebase preset, ship it as a separate `createFirebaseUploadHandler()` factory in another module, not as a built-in.
3. **Native detection lives in two places.** `HtCapacitorCameraService.isNativePlatform` and `HtCameraUpload.isNative` both probe `window.Capacitor?.isNativePlatform()`. If you change the detection logic, change both — they intentionally agree.
4. **Allowed MIME types are codified in the component.** `ALLOWED_MIME_TYPES` is a private constant in `ht-camera-upload.ts`. To support additional formats (e.g. HEIC), extend that array — `UploadConfig.allowedTypes` is an *additional* filter on top, not a way to bypass it.
5. **Cancellation is detected by string-matching error messages.** `isCancellation()` looks for `'User cancelled' | 'cancelled photos app' | 'No file selected' | 'canceled'`. If a future Capacitor version changes the wording, this list needs updating.
6. **The `CameraUploadOptions.allowMultiple` field exists for backwards compatibility only** — the component never reads it and `selectImage` hard-codes `multiple = false`. Don't add it to new code paths; if you need multi-select, design it as a separate API.

---

## File map

```
src/
  public-api.ts
  lib/
    types.ts                            # CapturedImage, UploadConfig, UploadHandler, UploadProgress, UploadResult
    ht-camera-upload.service.ts         # HtCameraUploadService + CameraUploadOptions (browser path)
    ht-capacitor-camera.service.ts      # HtCapacitorCameraService + CapacitorPhotoOptions (native path)
    ht-camera-upload.ts                 # <ht-camera-upload> standalone component
    ht-camera-upload.spec.ts            # tests
```

---

## Build & test

From the workspace root (never `cd projects/ht-camera-upload`):

```bash
npm run build:camera-upload   # ng build ht-camera-upload
npm run test:camera-upload    # ng test ht-camera-upload --watch=false
```

Adjust to the actual scripts in workspace `package.json`. As with the other `ht-*` libraries: never `npm install` inside this directory — peer-dep resolution and Windows path-length both bite.
