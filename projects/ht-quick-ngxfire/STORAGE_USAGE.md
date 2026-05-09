# Firebase Storage Service Usage

The `HtStorageService` provides a comprehensive interface for Firebase Storage operations using the modular API.

## Features

✅ **Modular API** - Uses modern Firebase Storage imports  
✅ **Angular 21 Compatible** - Uses `inject()` methodology  
✅ **Type-safe** - Full TypeScript support  
✅ **Progress Tracking** - Monitor upload progress  
✅ **Batch Operations** - Upload/delete multiple files  

## Basic Usage

```typescript
import { Component, inject, signal } from '@angular/core';
import { HtStorageService } from 'ht-quick-ngxfire';

@Component({
  selector: 'app-upload',
  template: `
    <input type="file" (change)="onFileSelected($event)">
    <button (click)="upload()">Upload</button>
    @if (uploadProgress() > 0) {
      <p>Progress: {{ uploadProgress() }}%</p>
    }
    @if (downloadURL()) {
      <img [src]="downloadURL()" alt="Uploaded image">
    }
  `
})
export class UploadComponent {
  private storageService = inject(HtStorageService);
  
  selectedFile = signal<File | null>(null);
  uploadProgress = signal(0);
  downloadURL = signal<string | null>(null);

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile.set(input.files[0]);
    }
  }

  async upload() {
    const file = this.selectedFile();
    if (!file) return;

    const path = `uploads/${Date.now()}_${file.name}`;
    
    // Upload with progress tracking
    const url = await this.storageService.uploadWithProgress(
      path,
      file,
      { contentType: file.type },
      (progress) => this.uploadProgress.set(progress)
    );
    
    this.downloadURL.set(url);
  }
}
```

## Upload Methods

### Simple Upload

```typescript
// Upload a file
async uploadFile() {
  const file = document.querySelector('input[type="file"]').files[0];
  
  const result = await this.storageService.uploadFile(
    'images/photo.jpg',
    file,
    { contentType: 'image/jpeg' }
  );
  
  console.log('Upload complete:', result);
}
```

### Upload with Progress Tracking

```typescript
// Upload with manual progress monitoring
uploadWithProgress() {
  const file = this.selectedFile;
  const path = `uploads/${file.name}`;
  
  const uploadTask = this.storageService.uploadFileResumable(
    path,
    file,
    { contentType: file.type }
  );
  
  // Monitor progress
  this.storageService.monitorUploadProgress(uploadTask)
    .subscribe({
      next: (progress) => console.log(`Progress: ${progress}%`),
      error: (error) => console.error('Upload failed:', error),
      complete: () => console.log('Upload complete!')
    });
}
```

### Upload String (Base64, Data URL)

```typescript
// Upload base64 string
async uploadBase64() {
  const base64String = 'iVBORw0KGgoAAAANSUhEUgAAAAUA...';
  
  await this.storageService.uploadString(
    'images/base64-image.png',
    base64String,
    'base64',
    { contentType: 'image/png' }
  );
}

// Upload data URL
async uploadDataURL() {
  const dataURL = 'data:image/png;base64,iVBORw0KGgo...';
  
  await this.storageService.uploadString(
    'images/data-url-image.png',
    dataURL,
    'data_url'
  );
}
```

## Download Methods

### Get Download URL

```typescript
// Observable version
getImageURL() {
  this.storageService.getDownloadURL('images/photo.jpg')
    .subscribe(url => {
      this.imageURL = url;
    });
}

// Promise version
async getImageURLAsync() {
  const url = await this.storageService.getDownloadURLAsync('images/photo.jpg');
  this.imageURL = url;
}
```

## Delete Files

### Single File

```typescript
async deleteFile() {
  await this.storageService.deleteFile('images/photo.jpg');
  console.log('File deleted');
}
```

### Multiple Files

```typescript
async deleteMultiple() {
  const paths = [
    'images/photo1.jpg',
    'images/photo2.jpg',
    'images/photo3.jpg'
  ];
  
  await this.storageService.deleteMultipleFiles(paths);
  console.log('All files deleted');
}
```

## File Metadata

### Get Metadata

```typescript
// Observable version
getFileInfo() {
  this.storageService.getMetadata('images/photo.jpg')
    .subscribe(metadata => {
      console.log('Size:', metadata.size);
      console.log('Type:', metadata.contentType);
      console.log('Created:', metadata.timeCreated);
    });
}

// Promise version
async getFileInfoAsync() {
  const metadata = await this.storageService.getMetadataAsync('images/photo.jpg');
  console.log('Metadata:', metadata);
}
```

### Update Metadata

```typescript
async updateFileMetadata() {
  const newMetadata = await this.storageService.updateMetadata(
    'images/photo.jpg',
    {
      contentType: 'image/jpeg',
      customMetadata: {
        'uploadedBy': 'user123',
        'category': 'profile-photos'
      }
    }
  );
  
  console.log('Updated metadata:', newMetadata);
}
```

## List Files

```typescript
async listFiles() {
  const result = await this.storageService.listAll('images/');
  
  // List all files
  result.items.forEach(item => {
    console.log('File:', item.name);
  });
  
  // List all folders
  result.prefixes.forEach(folder => {
    console.log('Folder:', folder.name);
  });
}
```

## Batch Operations

### Upload Multiple Files

```typescript
async uploadMultiple() {
  const files = [
    { path: 'images/photo1.jpg', data: file1, metadata: { contentType: 'image/jpeg' } },
    { path: 'images/photo2.jpg', data: file2, metadata: { contentType: 'image/jpeg' } },
    { path: 'images/photo3.jpg', data: file3, metadata: { contentType: 'image/jpeg' } }
  ];
  
  const results = await this.storageService.uploadMultipleFiles(files);
  console.log(`Uploaded ${results.length} files`);
}
```

## Advanced Examples

### Profile Photo Upload with Thumbnail

```typescript
@Component({
  selector: 'app-profile',
  template: `
    <input type="file" accept="image/*" (change)="onPhotoSelected($event)">
    <button (click)="uploadPhoto()" [disabled]="!selectedFile()">Upload</button>
    @if (progress() > 0 && progress() < 100) {
      <progress [value]="progress()" max="100"></progress>
    }
    @if (photoURL()) {
      <img [src]="photoURL()" alt="Profile">
    }
  `
})
export class ProfileComponent {
  private storageService = inject(HtStorageService);
  
  selectedFile = signal<File | null>(null);
  progress = signal(0);
  photoURL = signal<string | null>(null);

  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile.set(input.files[0]);
    }
  }

  async uploadPhoto() {
    const file = this.selectedFile();
    if (!file) return;

    const userId = 'user123'; // Get from auth
    const path = `users/${userId}/profile.jpg`;
    
    try {
      // Upload with progress
      const url = await this.storageService.uploadWithProgress(
        path,
        file,
        { 
          contentType: file.type,
          customMetadata: {
            uploadedAt: new Date().toISOString()
          }
        },
        (progress) => this.progress.set(progress)
      );
      
      this.photoURL.set(url);
      console.log('Photo uploaded successfully!');
    } catch (error) {
      console.error('Upload failed:', error);
    }
  }
}
```

### File Gallery with Delete

```typescript
@Component({
  selector: 'app-gallery',
  template: `
    @for (image of images(); track image.path) {
      <div class="image-card">
        <img [src]="image.url" [alt]="image.name">
        <button (click)="deleteImage(image.path)">Delete</button>
      </div>
    }
  `
})
export class GalleryComponent implements OnInit {
  private storageService = inject(HtStorageService);
  
  images = signal<Array<{ path: string; url: string; name: string }>>([]);

  async ngOnInit() {
    await this.loadImages();
  }

  async loadImages() {
    const result = await this.storageService.listAll('gallery/');
    
    const imagePromises = result.items.map(async item => ({
      path: item.fullPath,
      url: await this.storageService.getDownloadURLAsync(item.fullPath),
      name: item.name
    }));
    
    const images = await Promise.all(imagePromises);
    this.images.set(images);
  }

  async deleteImage(path: string) {
    await this.storageService.deleteFile(path);
    await this.loadImages(); // Reload gallery
  }
}
```

### Drag & Drop Upload

```typescript
@Component({
  selector: 'app-upload-zone',
  template: `
    <div 
      class="dropzone"
      (dragover)="onDragOver($event)"
      (drop)="onDrop($event)">
      Drop files here or click to browse
      <input type="file" multiple (change)="onFileSelect($event)">
    </div>
    @for (file of uploadQueue(); track file.name) {
      <div>{{ file.name }} - {{ file.progress }}%</div>
    }
  `
})
export class UploadZoneComponent {
  private storageService = inject(HtStorageService);
  
  uploadQueue = signal<Array<{ name: string; progress: number }>>([]);

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  async onDrop(event: DragEvent) {
    event.preventDefault();
    const files = Array.from(event.dataTransfer?.files || []);
    await this.uploadFiles(files);
  }

  async onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    await this.uploadFiles(files);
  }

  async uploadFiles(files: File[]) {
    const queue = files.map(f => ({ name: f.name, progress: 0 }));
    this.uploadQueue.set(queue);

    const uploads = files.map(async (file, index) => {
      const path = `uploads/${Date.now()}_${file.name}`;
      
      return this.storageService.uploadWithProgress(
        path,
        file,
        { contentType: file.type },
        (progress) => {
          const current = this.uploadQueue();
          current[index].progress = Math.round(progress);
          this.uploadQueue.set([...current]);
        }
      );
    });

    await Promise.all(uploads);
  }
}
```

## Service Methods Reference

| Method | Description | Returns |
|--------|-------------|---------|
| `uploadFile(path, data, metadata?)` | Simple file upload | `Promise<UploadResult>` |
| `uploadFileResumable(path, data, metadata?)` | Upload with progress tracking | `UploadTask` |
| `uploadString(path, data, format?, metadata?)` | Upload string data | `Promise<UploadResult>` |
| `getDownloadURL(path)` | Get file URL (Observable) | `Observable<string>` |
| `getDownloadURLAsync(path)` | Get file URL (Promise) | `Promise<string>` |
| `deleteFile(path)` | Delete a file | `Promise<void>` |
| `deleteMultipleFiles(paths)` | Delete multiple files | `Promise<void[]>` |
| `listAll(path)` | List files and folders | `Promise<ListResult>` |
| `getMetadata(path)` | Get file metadata (Observable) | `Observable<FullMetadata>` |
| `getMetadataAsync(path)` | Get file metadata (Promise) | `Promise<FullMetadata>` |
| `updateMetadata(path, metadata)` | Update file metadata | `Promise<FullMetadata>` |
| `uploadMultipleFiles(files)` | Upload multiple files | `Promise<UploadResult[]>` |
| `monitorUploadProgress(task)` | Monitor upload progress | `Observable<number>` |
| `uploadWithProgress(path, data, metadata?, onProgress?)` | Upload with callback | `Promise<string>` |

## Configuration

Make sure Storage is enabled in your `app.config.ts`:

```typescript
const firebaseConfig = {
  firebaseOptions: { /* ... */ },
  authOptions: { /* ... */ },
  firestore: true,
  database: false,
  functions: false,
  storage: true  // ← Enable Storage
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideHtQuickNgxFire(firebaseConfig)
  ]
};
```

## Security Rules

Don't forget to configure Storage security rules in Firebase Console:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Public read access
    match /public/{allPaths=**} {
      allow read;
      allow write: if request.auth != null;
    }
    
    // User-specific files
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
