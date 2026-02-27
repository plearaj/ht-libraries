import { Injectable, signal } from '@angular/core';
import { Observable, from } from 'rxjs';
import {
  Camera,
  CameraResultType,
  CameraSource,
  Photo,
  CameraDirection
} from '@capacitor/camera';
import { CapturedImage, UploadConfig, UploadProgress, UploadResult } from './types';

export interface CapacitorPhotoOptions {
  quality?: number;        // 0–100
  width?: number;
  height?: number;
  allowEditing?: boolean;
  /** Ignored internally — always requests DataUrl for CapturedImage compatibility */
  resultType?: 'uri' | 'base64' | 'dataUrl';
  saveToGallery?: boolean;
  correctOrientation?: boolean;
  source?: 'camera' | 'photos' | 'prompt';
  direction?: 'rear' | 'front';
}

@Injectable({
  providedIn: 'root'
})
export class HtCapacitorCameraService {
  /** Signal: true when running on iOS or Android native runtime */
  isNativePlatform = signal(this.checkNativePlatform());

  constructor() {}

  private checkNativePlatform(): boolean {
    return !!(window as any).Capacitor?.isNativePlatform();
  }

  /** Open native camera via Capacitor; produces a CapturedImage */
  takePhoto(options: CapacitorPhotoOptions = {}): Observable<CapturedImage> {
    return from(this.takePhotoAsync(options));
  }

  private async takePhotoAsync(options: CapacitorPhotoOptions): Promise<CapturedImage> {
    const photo = await Camera.getPhoto({
      quality: options.quality ?? 90,
      width: options.width,
      height: options.height,
      allowEditing: options.allowEditing ?? false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      saveToGallery: options.saveToGallery ?? false,
      correctOrientation: options.correctOrientation ?? true,
      direction: options.direction === 'front' ? CameraDirection.Front : CameraDirection.Rear
    });

    return this.formatPhotoResult(photo, 'camera');
  }

  /** Open native photo gallery via Capacitor; produces a CapturedImage */
  pickFromGallery(options: CapacitorPhotoOptions = {}): Observable<CapturedImage> {
    return from(this.pickFromGalleryAsync(options));
  }

  private async pickFromGalleryAsync(options: CapacitorPhotoOptions): Promise<CapturedImage> {
    const photo = await Camera.getPhoto({
      quality: options.quality ?? 90,
      width: options.width,
      height: options.height,
      allowEditing: options.allowEditing ?? false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
      correctOrientation: options.correctOrientation ?? true
    });

    return this.formatPhotoResult(photo, 'gallery');
  }

  /** Native prompt (camera or gallery choice); produces a CapturedImage */
  promptCameraOrGallery(options: CapacitorPhotoOptions = {}): Observable<CapturedImage> {
    return from(this.promptCameraOrGalleryAsync(options));
  }

  private async promptCameraOrGalleryAsync(
    options: CapacitorPhotoOptions
  ): Promise<CapturedImage> {
    const photo = await Camera.getPhoto({
      quality: options.quality ?? 90,
      width: options.width,
      height: options.height,
      allowEditing: options.allowEditing ?? false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt,
      saveToGallery: options.saveToGallery ?? false,
      correctOrientation: options.correctOrientation ?? true
    });

    return this.formatPhotoResult(photo, 'camera');
  }

  /** Request camera + photos permissions; returns granted status */
  async requestPermissions(): Promise<{ camera: boolean; photos: boolean }> {
    const permissions = await Camera.requestPermissions();
    return {
      camera: permissions.camera === 'granted',
      photos: permissions.photos === 'granted'
    };
  }

  /** Check current permissions without prompting */
  async checkPermissions(): Promise<{ camera: boolean; photos: boolean }> {
    const permissions = await Camera.checkPermissions();
    return {
      camera: permissions.camera === 'granted',
      photos: permissions.photos === 'granted'
    };
  }

  /** Execute upload via the host-supplied handler */
  upload<T>(
    image: CapturedImage,
    config: UploadConfig<T>
  ): Observable<UploadProgress | UploadResult<T>> {
    return config.handler(image);
  }

  private formatPhotoResult(
    photo: Photo,
    source: 'camera' | 'gallery'
  ): CapturedImage {
    const dataUrl = photo.dataUrl;
    if (!dataUrl) {
      throw new Error('Photo has no data URL — ensure resultType is DataUrl');
    }

    const mimeType = `image/${photo.format}`;
    const filename = `photo.${photo.format}`;
    const file = this.dataUrlToFile(dataUrl, filename, mimeType);

    return { file, dataUrl, mimeType, source };
  }

  private dataUrlToFile(dataUrl: string, filename: string, mimeType: string): File {
    const arr = dataUrl.split(',');
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mimeType });
  }
}
