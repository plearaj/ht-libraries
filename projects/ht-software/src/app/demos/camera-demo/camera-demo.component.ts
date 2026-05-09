import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { HtCameraUpload } from 'ht-camera-upload';
import type { CapturedImage } from 'ht-camera-upload';
import { CodeSnippetComponent } from '../../shared/code-snippet.component';

@Component({
  selector: 'app-camera-demo',
  standalone: true,
  imports: [HtCameraUpload, CodeSnippetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="demo-container">
      <h1>ht-camera-upload Demo</h1>
      <p class="demo-description">
        Cross-platform camera capture and file selection with image resizing and format conversion.
        Works with Capacitor on mobile devices and falls back to file picker in browsers.
      </p>

      <div class="browser-note">
        <strong>Browser note:</strong> Full camera capture requires a Capacitor-enabled device.
        In the browser, the file picker fallback is used for image selection.
      </div>

      <section class="demo-section">
        <h2>Live Component</h2>
        <ht-camera-upload
          [options]="cameraOptions"
          [triggerLabel]="'Select Image'"
          (imageCaptured)="onImageCaptured($event)"
          (uploadError)="onError($event)"
        />
      </section>

      @if (capturedImage()) {
        <section class="demo-section">
          <h2>Captured Image</h2>
          <div class="image-info">
            <p><strong>Source:</strong> {{ capturedImage()?.source }}</p>
            <p><strong>MIME Type:</strong> {{ capturedImage()?.mimeType }}</p>
            @if (capturedImage()?.width) {
              <p><strong>Dimensions:</strong> {{ capturedImage()?.width }} x {{ capturedImage()?.height }}</p>
            }
          </div>
          <img [src]="capturedImage()?.dataUrl" alt="Captured image preview" class="preview-image" />
        </section>
      }

      @if (error()) {
        <div class="error-message">{{ error() }}</div>
      }

      <app-code-snippet [code]="setupCode" language="typescript" />
    </div>
  `,
  styles: [`
    .demo-container { padding: 2rem; max-width: 1200px; margin: 0 auto; }
    .demo-description { color: #666; margin-bottom: 1rem; }
    .browser-note {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1.5rem;
    }
    .demo-section { margin: 1.5rem 0; padding: 1.5rem; border: 1px solid #e0e0e0; border-radius: 8px; background: #fafafa; }
    h2 { margin-top: 0; }
    .image-info { margin-bottom: 1rem; }
    .preview-image { max-width: 100%; max-height: 400px; border-radius: 8px; border: 1px solid #ddd; }
    .error-message { background: #fee2e2; border: 2px solid #ef4444; border-radius: 8px; padding: 1rem; margin: 1rem 0; color: #b91c1c; }
    code { background: #f0f0f0; padding: 0.1rem 0.3rem; border-radius: 3px; font-size: 0.9em; }
  `],
})
export class CameraDemoComponent {
  capturedImage = signal<CapturedImage | null>(null);
  error = signal<string>('');

  cameraOptions = {
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 0.8,
    outputFormat: 'image/jpeg' as const,
  };

  onImageCaptured(image: CapturedImage): void {
    this.capturedImage.set(image);
    this.error.set('');
  }

  onError(err: Error): void {
    this.error.set(err.message);
  }

  readonly setupCode = `// Template:
<ht-camera-upload
  [options]="cameraOptions"
  [triggerLabel]="'Select Image'"
  (imageCaptured)="onImageCaptured($event)"
  (uploadError)="onError($event)"
/>

// Component:
import { HtCameraUpload } from 'ht-camera-upload';
import type { CapturedImage } from 'ht-camera-upload';

cameraOptions = {
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 0.8,
  outputFormat: 'image/jpeg',
};

onImageCaptured(image: CapturedImage): void {
  console.log('Image captured:', image.source, image.mimeType);
  // image.dataUrl — immediate preview
  // image.file — File object for upload
}`;
}
