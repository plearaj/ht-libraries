import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
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
import { SimulationStatusService } from '../simulation/simulation-status.service';
import { SimStorageBackend } from '../simulation/storage/sim-storage.backend';
import { HtQuickNgxFireError } from '../ht-quick-ngxfire.error';

@Injectable({
  providedIn: 'root'
})
export class HtStorageService {
  private status = inject(SimulationStatusService);
  private isSim = this.status.get('storage') === 'simulated';
  private simBackend = this.isSim ? inject(SimStorageBackend) : null;
  private storage = inject(Storage, { optional: true });
  private readonly injector = inject(Injector);

  createRef(path: string): StorageReference {
    if (this.isSim) {
      // Sim ref: opaque path-keyed marker; consumers shouldn't introspect it.
      return ({ fullPath: path } as unknown) as StorageReference;
    }
    if (!this.storage) throw new HtQuickNgxFireError('Storage is not available', 'storage-unavailable');
    return ref(this.storage, path);
  }

  async uploadFile(path: string, data: Blob | Uint8Array | ArrayBuffer, metadata?: UploadMetadata): Promise<UploadResult> {
    if (this.simBackend) {
      const result = await this.simBackend.uploadFile(path, data, metadata as unknown as Record<string, unknown>);
      return result as unknown as UploadResult;
    }
    if (!this.storage) throw new HtQuickNgxFireError('Storage is not available', 'storage-unavailable');
    const storageRef = this.createRef(path);
    return runInInjectionContext(this.injector, () => uploadBytes(storageRef, data, metadata));
  }

  uploadFileResumable(path: string, data: Blob | Uint8Array | ArrayBuffer, metadata?: UploadMetadata): UploadTask {
    if (this.simBackend) {
      return this.simBackend.uploadFileResumable(path, data, metadata as unknown as Record<string, unknown>) as unknown as UploadTask;
    }
    if (!this.storage) throw new HtQuickNgxFireError('Storage is not available', 'storage-unavailable');
    const storageRef = this.createRef(path);
    return runInInjectionContext(this.injector, () => uploadBytesResumable(storageRef, data, metadata));
  }

  async uploadString(path: string, data: string, format?: StringFormat, metadata?: UploadMetadata): Promise<UploadResult> {
    if (this.simBackend) {
      const result = await this.simBackend.uploadString(path, data, format as unknown as string, metadata as unknown as Record<string, unknown>);
      return result as unknown as UploadResult;
    }
    if (!this.storage) throw new HtQuickNgxFireError('Storage is not available', 'storage-unavailable');
    const storageRef = this.createRef(path);
    return runInInjectionContext(this.injector, () => uploadString(storageRef, data, format, metadata));
  }

  getDownloadURL(path: string): Observable<string> {
    if (this.simBackend) return this.simBackend.getDownloadURL(path);
    if (!this.storage) throw new HtQuickNgxFireError('Storage is not available', 'storage-unavailable');
    const storageRef = this.createRef(path);
    return from(runInInjectionContext(this.injector, () => getDownloadURL(storageRef)));
  }

  async getDownloadURLAsync(path: string): Promise<string> {
    if (this.simBackend) return this.simBackend.getDownloadURLAsync(path);
    if (!this.storage) throw new HtQuickNgxFireError('Storage is not available', 'storage-unavailable');
    const storageRef = this.createRef(path);
    return runInInjectionContext(this.injector, () => getDownloadURL(storageRef));
  }

  async deleteFile(path: string): Promise<void> {
    if (this.simBackend) return this.simBackend.deleteFile(path);
    if (!this.storage) throw new HtQuickNgxFireError('Storage is not available', 'storage-unavailable');
    const storageRef = this.createRef(path);
    return runInInjectionContext(this.injector, () => deleteObject(storageRef));
  }

  async listAll(path: string, _maxResults?: number): Promise<ListResult> {
    if (this.simBackend) {
      const result = await this.simBackend.listAll(path);
      return result as unknown as ListResult;
    }
    if (!this.storage) throw new HtQuickNgxFireError('Storage is not available', 'storage-unavailable');
    const storageRef = this.createRef(path);
    return runInInjectionContext(this.injector, () => listAll(storageRef));
  }

  getMetadata(path: string): Observable<FullMetadata> {
    if (this.simBackend) return this.simBackend.getMetadata(path) as unknown as Observable<FullMetadata>;
    if (!this.storage) throw new HtQuickNgxFireError('Storage is not available', 'storage-unavailable');
    const storageRef = this.createRef(path);
    return from(runInInjectionContext(this.injector, () => getMetadata(storageRef)));
  }

  async getMetadataAsync(path: string): Promise<FullMetadata> {
    if (this.simBackend) return this.simBackend.getMetadataAsync(path) as unknown as Promise<FullMetadata>;
    if (!this.storage) throw new HtQuickNgxFireError('Storage is not available', 'storage-unavailable');
    const storageRef = this.createRef(path);
    return runInInjectionContext(this.injector, () => getMetadata(storageRef));
  }

  async updateMetadata(path: string, metadata: UploadMetadata): Promise<FullMetadata> {
    if (this.simBackend) return this.simBackend.updateMetadata(path, metadata as unknown as Record<string, unknown>) as unknown as Promise<FullMetadata>;
    if (!this.storage) throw new HtQuickNgxFireError('Storage is not available', 'storage-unavailable');
    const storageRef = this.createRef(path);
    return runInInjectionContext(this.injector, () => updateMetadata(storageRef, metadata));
  }

  async uploadMultipleFiles(files: Array<{ path: string; data: Blob | Uint8Array | ArrayBuffer; metadata?: UploadMetadata }>): Promise<UploadResult[]> {
    const uploads = files.map(file => this.uploadFile(file.path, file.data, file.metadata));
    return Promise.all(uploads);
  }

  async deleteMultipleFiles(paths: string[]): Promise<void[]> {
    const deletions = paths.map(path => this.deleteFile(path));
    return Promise.all(deletions);
  }

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

  async uploadWithProgress(path: string, data: Blob | Uint8Array | ArrayBuffer, metadata?: UploadMetadata, onProgress?: (progress: number) => void): Promise<string> {
    const uploadTask = this.uploadFileResumable(path, data, metadata);
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        snapshot => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(progress);
        },
        error => reject(error),
        async () => {
          // In sim mode, the snapshot.ref carries fullPath; use it.
          const url = await this.getDownloadURLAsync(uploadTask.snapshot.ref.fullPath);
          resolve(url);
        }
      );
    });
  }
}
