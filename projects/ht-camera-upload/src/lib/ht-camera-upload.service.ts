import { Injectable, signal } from '@angular/core';
import { Observable, from } from 'rxjs';
import { CapturedImage, UploadConfig, UploadProgress, UploadResult } from './types';

export interface CameraUploadOptions {
  maxWidth?: number;
  maxHeight?: number;
  /** 0–1 quality for JPEG/WebP output */
  quality?: number;
  outputFormat?: 'image/jpeg' | 'image/png' | 'image/webp';
  /** Retained for backwards compatibility; not used by the HtCameraUpload component */
  allowMultiple?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class HtCameraUploadService {
  /** Signal: whether the browser exposes MediaDevices camera API */
  isCameraSupported = signal(this.checkCameraSupport());

  constructor() {}

  private checkCameraSupport(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /** Open camera via input[capture]; produces a single CapturedImage */
  takePhoto(options: CameraUploadOptions = {}): Observable<CapturedImage> {
    return from(this.takePhotoAsync(options));
  }

  private async takePhotoAsync(options: CameraUploadOptions): Promise<CapturedImage> {
    if (!this.isCameraSupported()) {
      throw new Error('Camera is not supported on this device');
    }

    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';

      input.onchange = async (event: Event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }
        try {
          resolve(await this.processImageFile(file, options, 'camera'));
        } catch (error) {
          reject(error);
        }
      };

      input.onerror = () => reject(new Error('Camera access failed'));
      input.click();
    });
  }

  /** Open file picker for images; produces a single CapturedImage */
  selectImage(options: CameraUploadOptions = {}): Observable<CapturedImage> {
    return from(this.selectImageAsync(options));
  }

  private async selectImageAsync(options: CameraUploadOptions): Promise<CapturedImage> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = false;

      input.onchange = async (event: Event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }
        try {
          resolve(await this.processImageFile(file, options, 'file'));
        } catch (error) {
          reject(error);
        }
      };

      input.onerror = () => reject(new Error('File selection failed'));
      input.click();
    });
  }

  /** Execute upload via the host-supplied handler */
  upload<T>(
    image: CapturedImage,
    config: UploadConfig<T>
  ): Observable<UploadProgress | UploadResult<T>> {
    return config.handler(image);
  }

  /** Utility: convert data URL to File */
  dataUrlToFile(dataUrl: string, filename: string): File {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] ?? 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

  private async processImageFile(
    file: File,
    options: CameraUploadOptions,
    source: 'camera' | 'file' | 'gallery'
  ): Promise<CapturedImage> {
    const dataUrl = await this.fileToDataUrl(file);

    if (!options.maxWidth && !options.maxHeight && !options.quality && !options.outputFormat) {
      return { file, dataUrl, mimeType: file.type, source };
    }

    return this.resizeAndCompressImage(
      dataUrl,
      options.maxWidth,
      options.maxHeight,
      options.quality ?? 0.9,
      options.outputFormat ?? 'image/jpeg',
      source
    );
  }

  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private resizeAndCompressImage(
    dataUrl: string,
    maxWidth?: number,
    maxHeight?: number,
    quality: number = 0.9,
    outputFormat: string = 'image/jpeg',
    source: 'camera' | 'file' | 'gallery' = 'file'
  ): Promise<CapturedImage> {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (maxWidth && width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (maxHeight && height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob'));
              return;
            }
            const ext = outputFormat.split('/')[1];
            const file = new File([blob], `image.${ext}`, { type: outputFormat });
            const resultDataUrl = canvas.toDataURL(outputFormat, quality);
            resolve({ file, dataUrl: resultDataUrl, width, height, mimeType: outputFormat, source });
          },
          outputFormat,
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = dataUrl;
    });
  }
}
