# HtCameraUpload

A modern Angular 21 library for capturing photos from device cameras and uploading images/files with built-in image processing capabilities. Includes both web-based and native Capacitor/Ionic support.

## Features

- 📷 **Camera Capture**: Take photos using device camera (mobile/desktop)
- 🖼️ **Image Upload**: Select images from device gallery or file system
- 📁 **File Upload**: Upload any file type with customizable accept filters
- 🔧 **Image Processing**: Automatic resizing and compression
- 📱 **Capacitor/Ionic**: Native camera and filesystem support for mobile apps
- 🎨 **Format Conversion**: Convert between JPEG, PNG, and WebP
- 📊 **Multiple Files**: Support for single or multiple file selection
- 🌐 **Web & Native**: Works in both browser and native mobile apps

## Installation

```bash
npm install ht-camera-upload
```

## Usage

### Web-Based Camera (HtCameraUploadService)

Perfect for web apps and PWAs:

```typescript
import { Component, inject } from '@angular/core';
import { HtCameraUploadService } from 'ht-camera-upload';

@Component({
  selector: 'app-photo',
  template: `
    <button (click)="takePhoto()">Take Photo</button>
    @if (photoUrl) {
      <img [src]="photoUrl" alt="Captured photo">
    }
  `
})
export class PhotoComponent {
  private cameraService = inject(HtCameraUploadService);
  photoUrl: string | null = null;

  takePhoto() {
    this.cameraService.takePhoto().subscribe({
      next: (result) => {
        this.photoUrl = result.dataUrl;
      },
      error: (error) => console.error(error)
    });
  }
}
```

### Capacitor/Ionic Native (HtCapacitorCameraService)

For Ionic/Capacitor apps with native camera access:

```typescript
import { Component, inject } from '@angular/core';
import { HtCapacitorCameraService } from 'ht-camera-upload';

@Component({
  selector: 'app-photo',
  template: `
    <button (click)="takePhoto()">Take Photo</button>
    <button (click)="pickFromGallery()">Choose from Gallery</button>
    <button (click)="promptUser()">Camera or Gallery</button>
    @if (photoUrl) {
      <img [src]="photoUrl" alt="Photo">
    }
  `
})
export class PhotoComponent {
  private capacitorCamera = inject(HtCapacitorCameraService);
  photoUrl: string | null = null;

  async ngOnInit() {
    // Request permissions on app start
    const permissions = await this.capacitorCamera.requestPermissions();
    console.log('Camera:', permissions.camera, 'Photos:', permissions.photos);
  }

  takePhoto() {
    this.capacitorCamera.takePhoto({
      quality: 90,
      width: 1920,
      height: 1080,
      allowEditing: true,
      saveToGallery: false,
      direction: 'rear',
      resultType: 'dataUrl'
    }).subscribe(result => {
      this.photoUrl = result.dataUrl!;
    });
  }

  pickFromGallery() {
    this.capacitorCamera.pickFromGallery({
      quality: 90,
      resultType: 'dataUrl'
    }).subscribe(result => {
      this.photoUrl = result.dataUrl!;
    });
  }

  promptUser() {
    // Let user choose camera or gallery
    this.capacitorCamera.promptCameraOrGallery({
      quality: 90,
      resultType: 'dataUrl'
    }).subscribe(result => {
      this.photoUrl = result.dataUrl!;
    });
  }
}
```

### Save Photo to Device (Capacitor)

```typescript
async savePhoto() {
  this.capacitorCamera.takePhoto({
    quality: 90,
    resultType: 'base64'
  }).subscribe(async (result) => {
    if (result.base64) {
      const path = await this.capacitorCamera.savePhoto(
        result.base64,
        `photo_${Date.now()}.${result.format}`,
        'DOCUMENTS'
      );
      console.log('Saved to:', path);
    }
  });
}
```

### Image Upload with Processing

```typescript
uploadPhoto() {
  this.cameraService.uploadImages({
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.8,
    outputFormat: 'image/jpeg'
  }).subscribe(results => {
    console.log('Uploaded:', results);
  });
}
```

### File Upload

```typescript
uploadPDF() {
  this.cameraService.uploadFiles('.pdf').subscribe(files => {
    console.log('Selected:', files[0]);
  });
}
```

## API

### HtCameraUploadService (Web)

- `takePhoto(options?: CameraUploadOptions): Observable<FileUploadResult>`
- `uploadImages(options?: CameraUploadOptions): Observable<FileUploadResult[]>`
- `uploadFiles(accept?: string, allowMultiple?: boolean): Observable<File[]>`
- `dataUrlToFile(dataUrl: string, filename: string): File`
- `getImageDimensions(dataUrl: string): Promise<{width: number, height: number}>`

### HtCapacitorCameraService (Native)

- `takePhoto(options?: CapacitorPhotoOptions): Observable<CapacitorPhotoResult>`
- `pickFromGallery(options?: CapacitorPhotoOptions): Observable<CapacitorPhotoResult>`
- `promptCameraOrGallery(options?: CapacitorPhotoOptions): Observable<CapacitorPhotoResult>`
- `requestPermissions(): Promise<{camera: boolean, photos: boolean}>`
- `checkPermissions(): Promise<{camera: boolean, photos: boolean}>`
- `savePhoto(base64: string, fileName: string, directory?): Promise<string>`
- `readPhoto(path: string, directory?): Promise<string>`
- `deletePhoto(path: string, directory?): Promise<void>`
- `base64ToDataUrl(base64: string, format?: string): string`
- `dataUrlToBase64(dataUrl: string): string`

### Types

```typescript
// Web Service Types
interface CameraUploadOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  outputFormat?: 'image/jpeg' | 'image/png' | 'image/webp';
  allowMultiple?: boolean;
}

interface FileUploadResult {
  file: File;
  dataUrl: string;
  width?: number;
  height?: number;
}

// Capacitor Service Types
interface CapacitorPhotoOptions {
  quality?: number; // 0-100
  width?: number;
  height?: number;
  allowEditing?: boolean;
  resultType?: 'uri' | 'base64' | 'dataUrl';
  saveToGallery?: boolean;
  correctOrientation?: boolean;
  source?: 'camera' | 'photos' | 'prompt';
  direction?: 'rear' | 'front';
}

interface CapacitorPhotoResult {
  dataUrl?: string;
  base64?: string;
  uri?: string;
  format: string;
  saved: boolean;
  path?: string;
  webPath?: string;
}
```

## Capacitor Setup

For Ionic/Capacitor apps, install Capacitor Camera plugin:

```bash
npm install @capacitor/camera @capacitor/filesystem
npx cap sync
```

Add permissions to your native projects:

**iOS (Info.plist):**
```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access to take photos</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>We need photo library access to select images</string>
```

**Android (AndroidManifest.xml):**
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
```

## License

MIT
