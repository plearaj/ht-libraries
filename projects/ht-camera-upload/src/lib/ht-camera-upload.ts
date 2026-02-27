import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { HtCameraUploadService, CameraUploadOptions } from './ht-camera-upload.service';
import { HtCapacitorCameraService } from './ht-capacitor-camera.service';
import { CapturedImage, UploadConfig, UploadProgress, UploadResult } from './types';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

@Component({
  selector: 'ht-camera-upload',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ht-camera-upload">
      @if (cameraAvailable()) {
        <button type="button" (click)="captureFromCamera()">
          {{ triggerLabel() }}
        </button>
      } @else {
        <button type="button" disabled aria-disabled="true">
          {{ triggerLabel() }}
        </button>
        <p class="camera-unavailable">Camera unavailable</p>
      }

      <button type="button" (click)="selectFromFiles()">
        Choose File
      </button>

      @if (currentImage()) {
        <div class="preview">
          <img [src]="currentImage()!.dataUrl" alt="Preview" />
        </div>

        @if (uploadConfig()) {
          <button
            type="button"
            (click)="uploadImage()"
            [disabled]="uploadState() === 'uploading'"
          >
            Upload
          </button>
        }
      }

      @if (uploadState() === 'uploading') {
        <p class="upload-status">Uploading...</p>
      }
      @if (uploadState() === 'error') {
        <p class="upload-status">Upload failed — tap Upload to retry</p>
      }
    </div>
  `,
  styles: ``
})
export class HtCameraUpload implements OnInit {
  private readonly browserService = inject(HtCameraUploadService);
  private readonly capacitorService = inject(HtCapacitorCameraService);

  // --- Inputs ---
  options = input<CameraUploadOptions>({});
  uploadConfig = input<UploadConfig<unknown> | undefined>(undefined);
  triggerLabel = input<string>('Add Photo');

  // --- Outputs ---
  imageCaptured = output<CapturedImage>();
  uploadProgress = output<UploadProgress>();
  uploadComplete = output<UploadResult<unknown>>();
  uploadError = output<Error>();

  // --- Public signals ---
  isNative = signal<boolean>(
    typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform()
  );
  cameraAvailable = signal<boolean>(true);
  currentImage = signal<CapturedImage | null>(null);
  uploadState = signal<'idle' | 'uploading' | 'complete' | 'error'>('idle');

  ngOnInit(): void {
    if (this.isNative()) {
      this.capacitorService
        .checkPermissions()
        .then(permissions => this.cameraAvailable.set(permissions.camera))
        .catch(() => this.cameraAvailable.set(false));
    } else {
      this.cameraAvailable.set(this.browserService.isCameraSupported());
    }
  }

  captureFromCamera(): void {
    const source$ = this.isNative()
      ? this.capacitorService.promptCameraOrGallery()
      : this.browserService.takePhoto(this.options());

    source$.subscribe({
      next: image => this.handleCapturedImage(image),
      error: err => this.handleCaptureError(err)
    });
  }

  selectFromFiles(): void {
    const source$ = this.isNative()
      ? this.capacitorService.pickFromGallery()
      : this.browserService.selectImage(this.options());

    source$.subscribe({
      next: image => this.handleCapturedImage(image),
      error: err => this.handleCaptureError(err)
    });
  }

  uploadImage(): void {
    const image = this.currentImage();
    const config = this.uploadConfig();
    if (!image || !config) {
      return;
    }

    if (config.maxSizeBytes != null && image.file.size > config.maxSizeBytes) {
      this.uploadError.emit(
        new Error(
          `File size ${image.file.size} bytes exceeds limit of ${config.maxSizeBytes} bytes`
        )
      );
      return;
    }

    if (config.allowedTypes != null && !config.allowedTypes.includes(image.mimeType)) {
      this.uploadError.emit(new Error(`Unsupported file type: ${image.mimeType}`));
      return;
    }

    this.uploadState.set('uploading');

    const upload$ = this.isNative()
      ? this.capacitorService.upload(image, config)
      : this.browserService.upload(image, config);

    upload$.subscribe({
      next: event => {
        if (event.type === 'progress') {
          this.uploadProgress.emit(event as UploadProgress);
        } else if (event.type === 'complete') {
          this.uploadState.set('complete');
          this.uploadComplete.emit(event as UploadResult<unknown>);
        }
      },
      error: err => {
        this.uploadState.set('error');
        this.uploadError.emit(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  private handleCapturedImage(image: CapturedImage): void {
    if (!ALLOWED_MIME_TYPES.includes(image.mimeType)) {
      this.uploadError.emit(new Error(`Unsupported file type: ${image.mimeType}`));
      return;
    }
    this.currentImage.set(image);
    this.imageCaptured.emit(image);
  }

  private handleCaptureError(err: unknown): void {
    if (!this.isCancellation(err)) {
      this.uploadError.emit(err instanceof Error ? err : new Error(String(err)));
    }
    this.uploadState.set('idle');
  }

  private isCancellation(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err);
    return (
      msg.includes('User cancelled') ||
      msg.includes('cancelled photos app') ||
      msg.includes('No file selected') ||
      msg.includes('canceled')
    );
  }
}
