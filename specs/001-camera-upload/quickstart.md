# Quickstart: ht-camera-upload

**Branch**: `001-camera-upload` | **Date**: 2026-02-18

This guide verifies the library is correctly implemented and consumable. Run it
top-to-bottom after the implementation tasks are complete.

---

## Prerequisites

- Angular 21 Ionic app with npm link pointing to `dist/ht-camera-upload`
  (or a locally built copy)
- A physical device or emulator with camera access (for native Capacitor path)
- A desktop browser (for browser fallback path)

---

## Step 1 — Build the Library

From the workspace root:

```bash
ng build ht-camera-upload
```

Expected: build completes with zero errors and zero warnings.

---

## Step 2 — Link for Local Testing

```bash
cd dist/ht-camera-upload
npm link
```

In your test app:

```bash
npm link ht-camera-upload
```

---

## Step 3 — Add to App Config

```typescript
// app.config.ts — no additional providers needed;
// HtCameraUploadService and HtCapacitorCameraService are providedIn: 'root'
```

---

## Step 4 — Add Component to a Template

```typescript
// my-upload.component.ts
import { Component } from '@angular/core';
import { HtCameraUpload, CapturedImage, UploadConfig, UploadResult } from 'ht-camera-upload';
import { Observable, of } from 'rxjs';

@Component({
  selector: 'app-my-upload',
  standalone: true,
  imports: [HtCameraUpload],
  template: `
    <ht-camera-upload
      triggerLabel="Add Photo"
      [uploadConfig]="uploadConfig"
      (imageCaptured)="onCaptured($event)"
      (uploadComplete)="onComplete($event)"
      (uploadError)="onError($event)"
    />
    @if (capturedImage) {
      <img [src]="capturedImage.dataUrl" alt="Preview" style="max-width: 200px" />
    }
  `
})
export class MyUploadComponent {
  capturedImage: CapturedImage | null = null;

  uploadConfig: UploadConfig<string> = {
    handler: (image) => {
      // Replace with your real upload logic (e.g., Firebase Storage)
      console.log('Uploading:', image.file.name, image.mimeType);
      // Simulate a completed upload returning a URL
      return of({ type: 'complete' as const, ref: 'https://example.com/my-image.jpg' });
    }
  };

  onCaptured(image: CapturedImage) {
    this.capturedImage = image;
    console.log('Image captured from:', image.source);
  }

  onComplete(result: UploadResult<string>) {
    console.log('Upload complete, ref:', result.ref);
  }

  onError(error: Error) {
    console.error('Upload error:', error.message);
  }
}
```

---

## Step 5 — Verify: Camera Path (Native)

On an iOS or Android device:
1. Tap the "Add Photo" button.
2. Native camera/gallery prompt appears.
3. Take a photo.
4. Preview thumbnail appears in `<img>` within 2 seconds.
5. Console logs "Uploading:" followed by the file name.

**Pass criteria**: Steps 1–5 complete without errors.

---

## Step 6 — Verify: File Picker Path (Browser)

In a desktop browser:
1. Tap the "Add Photo" button.
2. OS file picker opens filtered to images.
3. Select any `.jpg` or `.png` file.
4. Preview thumbnail appears within 1 second.

**Pass criteria**: Steps 1–4 complete without errors.

---

## Step 7 — Verify: Camera Unavailable Fallback

In a browser with camera blocked (or no camera hardware):
1. Tap the "Add Photo" button.
2. The camera option is absent or clearly disabled.
3. File picker opens normally.

**Pass criteria**: No broken UI; file picker works; camera option absent or disabled.

---

## Step 8 — Verify: Cancellation

1. Tap "Add Photo".
2. Close the camera/file picker without selecting an image.
3. Component returns to initial state.
4. No error is logged or displayed.

**Pass criteria**: Component state is `idle`; no error events emitted.

---

## Step 9 — Verify: Unsupported File Type

1. Tap "Add Photo" → File picker.
2. Select a non-image file (if the OS allows bypassing the filter, e.g., rename a .txt).
3. Component displays a human-readable error message.
4. `uploadError` output emits.

**Pass criteria**: Error message visible; no broken preview rendered.

---

## Step 10 — Run Tests

```bash
ng test ht-camera-upload
```

Expected: all tests pass; no failures.

---

## Step 11 — Run Lint and Format

```bash
npm run lint
npm run format
```

Expected: zero lint errors; no formatting changes required.

---

## Validation Checklist

- [ ] `ng build ht-camera-upload` succeeds with zero errors
- [ ] Camera capture works on native device; preview appears within 2 s
- [ ] File picker works in browser; preview appears within 1 s
- [ ] Camera-unavailable fallback shows file-only UI
- [ ] Cancellation returns component to idle with no error
- [ ] Unsupported file type shows readable error
- [ ] `uploadComplete` event emits with expected `ref` value
- [ ] `ng test ht-camera-upload` passes
- [ ] `npm run lint` passes
