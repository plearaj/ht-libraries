/**
 * ht-camera-upload — Component & Service API Contracts
 * Branch: 001-camera-upload | Date: 2026-02-18
 *
 * This file defines the intended TypeScript public surface for the library.
 * It is a design artifact, not compiled code.
 * Implementation must match these signatures exactly.
 */

import { Observable } from 'rxjs';
import { Signal, InputSignal, OutputEmitterRef } from '@angular/core';

// ---------------------------------------------------------------------------
// Shared Types (to live in projects/ht-camera-upload/src/lib/types.ts)
// ---------------------------------------------------------------------------

export interface CapturedImage {
  file: File;
  dataUrl: string;
  width?: number;
  height?: number;
  mimeType: string;
  source: 'camera' | 'file' | 'gallery';
}

export interface UploadProgress {
  type: 'progress';
  percent: number;
  bytesTransferred: number;
  totalBytes: number;
}

export interface UploadResult<T> {
  type: 'complete';
  ref: T;
}

export type UploadHandler<T> = (
  image: CapturedImage
) => Observable<UploadProgress | UploadResult<T>>;

export interface UploadConfig<T> {
  handler: UploadHandler<T>;
  maxSizeBytes?: number;
  allowedTypes?: string[];
}

// ---------------------------------------------------------------------------
// HtCameraUpload Component Contract
// (projects/ht-camera-upload/src/lib/ht-camera-upload.ts)
// ---------------------------------------------------------------------------

/**
 * Selector: ht-camera-upload
 * ChangeDetectionStrategy: OnPush (REQUIRED by constitution)
 * Standalone: true
 */
export interface HtCameraUploadComponent<T = unknown> {
  // --- Inputs (signal-based via input() function) ---

  /** Options for capture and optional image processing */
  options: InputSignal<CameraUploadOptions>;

  /** Upload configuration supplied by the host app.
   *  When provided, the component shows an "Upload" action after capture. */
  uploadConfig: InputSignal<UploadConfig<T> | undefined>;

  /** Label for the trigger button (default: 'Add Photo') */
  triggerLabel: InputSignal<string>;

  // --- Outputs (via output() function) ---

  /** Emitted when an image is captured or selected and preview is ready */
  imageCaptured: OutputEmitterRef<CapturedImage>;

  /** Emitted for each progress event during upload */
  uploadProgress: OutputEmitterRef<UploadProgress>;

  /** Emitted when upload completes successfully */
  uploadComplete: OutputEmitterRef<UploadResult<T>>;

  /** Emitted on any error: unsupported type, size exceeded, permission denied,
   *  upload failure, or camera unavailable */
  uploadError: OutputEmitterRef<Error>;

  // --- Public signals (readable by host) ---

  /** Whether the component is currently on a native Capacitor platform */
  isNative: Signal<boolean>;

  /** Whether camera access is available in the current environment */
  cameraAvailable: Signal<boolean>;

  /** The most recently captured image; null if no capture yet */
  currentImage: Signal<CapturedImage | null>;

  /** Upload state */
  uploadState: Signal<'idle' | 'uploading' | 'complete' | 'error'>;
}

// ---------------------------------------------------------------------------
// CameraUploadOptions (existing — refined)
// (projects/ht-camera-upload/src/lib/ht-camera-upload.service.ts)
// ---------------------------------------------------------------------------

export interface CameraUploadOptions {
  maxWidth?: number;
  maxHeight?: number;
  /** 0–1 quality for JPEG/WebP output */
  quality?: number;
  outputFormat?: 'image/jpeg' | 'image/png' | 'image/webp';
  // allowMultiple is RETAINED in the service interface for backwards compatibility
  // but MUST NOT be surfaced or used in the HtCameraUpload component.
}

// ---------------------------------------------------------------------------
// HtCameraUploadService Contract (browser path)
// (projects/ht-camera-upload/src/lib/ht-camera-upload.service.ts)
// ---------------------------------------------------------------------------

export interface IHtCameraUploadService {
  /** Signal: whether the browser exposes MediaDevices camera API */
  isCameraSupported: Signal<boolean>;

  /** Open camera via input[capture]; produces a single CapturedImage */
  takePhoto(options?: CameraUploadOptions): Observable<CapturedImage>;

  /** Open file picker for images; produces a single CapturedImage */
  selectImage(options?: CameraUploadOptions): Observable<CapturedImage>;

  /** Execute upload via the host-supplied handler */
  upload<T>(image: CapturedImage, config: UploadConfig<T>): Observable<UploadProgress | UploadResult<T>>;

  /** Utility: convert data URL to File */
  dataUrlToFile(dataUrl: string, filename: string): File;
}

// ---------------------------------------------------------------------------
// CapacitorPhotoOptions (existing)
// HtCapacitorCameraService Contract (native path)
// (projects/ht-camera-upload/src/lib/ht-capacitor-camera.service.ts)
// ---------------------------------------------------------------------------

export interface CapacitorPhotoOptions {
  quality?: number;      // 0–100
  width?: number;
  height?: number;
  allowEditing?: boolean;
  resultType?: 'uri' | 'base64' | 'dataUrl';
  saveToGallery?: boolean;
  correctOrientation?: boolean;
  source?: 'camera' | 'photos' | 'prompt';
  direction?: 'rear' | 'front';
}

export interface IHtCapacitorCameraService {
  /** Signal: true when running on iOS or Android native runtime */
  isNativePlatform: Signal<boolean>;

  /** Open native camera via Capacitor; produces a CapturedImage */
  takePhoto(options?: CapacitorPhotoOptions): Observable<CapturedImage>;

  /** Open native photo gallery via Capacitor; produces a CapturedImage */
  pickFromGallery(options?: CapacitorPhotoOptions): Observable<CapturedImage>;

  /** Native prompt (camera or gallery choice); produces a CapturedImage */
  promptCameraOrGallery(options?: CapacitorPhotoOptions): Observable<CapturedImage>;

  /** Request camera + photos permissions; returns granted status */
  requestPermissions(): Promise<{ camera: boolean; photos: boolean }>;

  /** Check current permissions without prompting */
  checkPermissions(): Promise<{ camera: boolean; photos: boolean }>;

  /** Execute upload via the host-supplied handler */
  upload<T>(image: CapturedImage, config: UploadConfig<T>): Observable<UploadProgress | UploadResult<T>>;
}
