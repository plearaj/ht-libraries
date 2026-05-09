import { inject, Injectable } from '@angular/core';
import { Storage } from '@angular/fire/storage';
import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  uploadString,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
  updateMetadata,
  StorageReference,
  UploadResult,
  UploadTask,
  UploadMetadata,
  FullMetadata,
  ListResult,
  StringFormat
} from '@angular/fire/storage';
import { Observable, from } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HtStorageService {
  private storage = inject(Storage);

  constructor() {
    // intentionally empty
  }

  /**
   * Create a reference to a file or folder in Storage
   * @param path Path to the file or folder
   */
  createRef(path: string): StorageReference {
    return ref(this.storage, path);
  }

  /**
   * Upload a file (Blob, File, or Uint8Array)
   * @param path Path where the file will be stored
   * @param data File data to upload
   * @param metadata Optional metadata for the file
   * @returns Promise with upload result
   */
  async uploadFile(
    path: string,
    data: Blob | Uint8Array | ArrayBuffer,
    metadata?: UploadMetadata
  ): Promise<UploadResult> {
    const storageRef = this.createRef(path);
    return await uploadBytes(storageRef, data, metadata);
  }

  /**
   * Upload a file with progress tracking
   * @param path Path where the file will be stored
   * @param data File data to upload
   * @param metadata Optional metadata for the file
   * @returns UploadTask that can be monitored for progress
   */
  uploadFileResumable(
    path: string,
    data: Blob | Uint8Array | ArrayBuffer,
    metadata?: UploadMetadata
  ): UploadTask {
    const storageRef = this.createRef(path);
    return uploadBytesResumable(storageRef, data, metadata);
  }

  /**
   * Upload a string (base64, data URL, or raw string)
   * @param path Path where the string will be stored
   * @param data String data to upload
   * @param format Format of the string (base64, base64url, data_url, or raw)
   * @param metadata Optional metadata
   */
  async uploadString(
    path: string,
    data: string,
    format?: StringFormat,
    metadata?: UploadMetadata
  ): Promise<UploadResult> {
    const storageRef = this.createRef(path);
    return await uploadString(storageRef, data, format, metadata);
  }

  /**
   * Get the download URL for a file
   * @param path Path to the file
   * @returns Observable of the download URL
   */
  getDownloadURL(path: string): Observable<string> {
    const storageRef = this.createRef(path);
    return from(getDownloadURL(storageRef));
  }

  /**
   * Get the download URL for a file (Promise version)
   * @param path Path to the file
   * @returns Promise of the download URL
   */
  async getDownloadURLAsync(path: string): Promise<string> {
    const storageRef = this.createRef(path);
    return await getDownloadURL(storageRef);
  }

  /**
   * Delete a file from Storage
   * @param path Path to the file to delete
   */
  async deleteFile(path: string): Promise<void> {
    const storageRef = this.createRef(path);
    return await deleteObject(storageRef);
  }

  /**
   * List all files and folders at a path
   * @param path Path to list contents of
   * @param maxResults Optional maximum number of results
   * @returns Promise with list result
   */
  async listAll(path: string, maxResults?: number): Promise<ListResult> {
    const storageRef = this.createRef(path);
    return await listAll(storageRef);
  }

  /**
   * Get metadata for a file
   * @param path Path to the file
   * @returns Observable of file metadata
   */
  getMetadata(path: string): Observable<FullMetadata> {
    const storageRef = this.createRef(path);
    return from(getMetadata(storageRef));
  }

  /**
   * Get metadata for a file (Promise version)
   * @param path Path to the file
   * @returns Promise of file metadata
   */
  async getMetadataAsync(path: string): Promise<FullMetadata> {
    const storageRef = this.createRef(path);
    return await getMetadata(storageRef);
  }

  /**
   * Update metadata for a file
   * @param path Path to the file
   * @param metadata New metadata to set
   * @returns Promise of updated metadata
   */
  async updateMetadata(path: string, metadata: UploadMetadata): Promise<FullMetadata> {
    const storageRef = this.createRef(path);
    return await updateMetadata(storageRef, metadata);
  }

  /**
   * Upload multiple files
   * @param files Array of objects with path and data
   * @returns Promise array of upload results
   */
  async uploadMultipleFiles(
    files: Array<{ path: string; data: Blob | Uint8Array | ArrayBuffer; metadata?: UploadMetadata }>
  ): Promise<UploadResult[]> {
    const uploads = files.map(file => this.uploadFile(file.path, file.data, file.metadata));
    return await Promise.all(uploads);
  }

  /**
   * Delete multiple files
   * @param paths Array of file paths to delete
   * @returns Promise that resolves when all files are deleted
   */
  async deleteMultipleFiles(paths: string[]): Promise<void[]> {
    const deletions = paths.map(path => this.deleteFile(path));
    return await Promise.all(deletions);
  }

  /**
   * Monitor upload progress
   * @param uploadTask Upload task from uploadFileResumable
   * @returns Observable of upload progress (0-100)
   */
  monitorUploadProgress(uploadTask: UploadTask): Observable<number> {
    return new Observable(observer => {
      uploadTask.on(
        'state_changed',
        snapshot => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          observer.next(progress);
        },
        error => observer.error(error),
        () => observer.complete()
      );
    });
  }

  /**
   * Upload file with progress and get download URL when complete
   * @param path Path where the file will be stored
   * @param data File data to upload
   * @param metadata Optional metadata
   * @param onProgress Optional callback for progress updates
   * @returns Promise of download URL
   */
  async uploadWithProgress(
    path: string,
    data: Blob | Uint8Array | ArrayBuffer,
    metadata?: UploadMetadata,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const uploadTask = this.uploadFileResumable(path, data, metadata);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        snapshot => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress(progress);
          }
        },
        error => reject(error),
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  }
}
