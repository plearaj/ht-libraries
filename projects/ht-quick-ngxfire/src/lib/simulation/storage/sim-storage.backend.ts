import { Injectable, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { HtQuickNgxFireError } from '../../ht-quick-ngxfire.error';

/**
 * SimStorageBackend — in-memory blob store backing HtStorageService in
 * simulation. Plain `@Injectable()` (registered conditionally per L4 / T009).
 *
 * Blob URLs are session-scoped; revoked on destroy for clean teardown.
 */

interface SimStorageObject {
  blob: Blob;
  metadata: Record<string, unknown>;
  contentType: string;
}

export interface SimUploadSnapshot {
  bytesTransferred: number;
  totalBytes: number;
  state: 'success';
  ref: { fullPath: string };
  metadata: Record<string, unknown>;
}

export interface SimUploadTask {
  snapshot: SimUploadSnapshot;
  on(
    event: 'state_changed',
    onProgress: (snapshot: SimUploadSnapshot) => void,
    onError?: (err: Error) => void,
    onComplete?: () => void,
  ): () => void;
  then<T>(onFulfilled: (snapshot: SimUploadSnapshot) => T | Promise<T>): Promise<T>;
}

@Injectable()
export class SimStorageBackend implements OnDestroy {
  private objects = new Map<string, SimStorageObject>();
  private urls = new Map<string, string>();

  uploadFile(
    path: string,
    data: Blob | Uint8Array | ArrayBuffer,
    metadata?: Record<string, unknown>,
  ): Promise<{ ref: { fullPath: string }; metadata: Record<string, unknown> }> {
    return this.deferred(() => {
      const blob = this.toBlob(data, metadata);
      this.storeBlob(path, blob, metadata ?? {});
      return { ref: { fullPath: path }, metadata: metadata ?? {} };
    });
  }

  uploadFileResumable(
    path: string,
    data: Blob | Uint8Array | ArrayBuffer,
    metadata?: Record<string, unknown>,
  ): SimUploadTask {
    const blob = this.toBlob(data, metadata);
    this.storeBlob(path, blob, metadata ?? {});
    const snapshot: SimUploadSnapshot = {
      bytesTransferred: blob.size,
      totalBytes: blob.size,
      state: 'success',
      ref: { fullPath: path },
      metadata: metadata ?? {},
    };
    const task: SimUploadTask = {
      snapshot,
      on(_event, onProgress, _onError, onComplete) {
        queueMicrotask(() => {
          onProgress(snapshot);
          onComplete?.();
        });
        return () => { /* unsubscribe no-op */ };
      },
      then<T>(onFulfilled: (s: SimUploadSnapshot) => T | Promise<T>): Promise<T> {
        return Promise.resolve().then(() => onFulfilled(snapshot));
      },
    };
    return task;
  }

  uploadString(path: string, data: string, _format?: string, metadata?: Record<string, unknown>): Promise<{ ref: { fullPath: string }; metadata: Record<string, unknown> }> {
    const blob = new Blob([data], { type: (metadata?.['contentType'] as string) ?? 'text/plain' });
    return this.uploadFile(path, blob, metadata);
  }

  getDownloadURL(path: string): Observable<string> {
    return new Observable((subscriber) => {
      queueMicrotask(() => {
        const url = this.urls.get(path);
        if (!url) {
          subscriber.error(new HtQuickNgxFireError(`Object not found: ${path}`, 'storage/object-not-found'));
        } else {
          subscriber.next(url);
          subscriber.complete();
        }
      });
    });
  }

  getDownloadURLAsync(path: string): Promise<string> {
    return this.deferred(() => {
      const url = this.urls.get(path);
      if (!url) throw new HtQuickNgxFireError(`Object not found: ${path}`, 'storage/object-not-found');
      return url;
    });
  }

  deleteFile(path: string): Promise<void> {
    return this.deferred(() => {
      const url = this.urls.get(path);
      if (url) URL.revokeObjectURL(url);
      this.urls.delete(path);
      this.objects.delete(path);
    });
  }

  listAll(_path: string, _maxResults?: number): Promise<{ items: Array<{ fullPath: string }>; prefixes: Array<{ fullPath: string }> }> {
    return this.deferred(() => {
      const items: Array<{ fullPath: string }> = [];
      for (const key of this.objects.keys()) items.push({ fullPath: key });
      return { items, prefixes: [] };
    });
  }

  getMetadata(path: string): Observable<Record<string, unknown>> {
    return new Observable((subscriber) => {
      queueMicrotask(() => {
        const obj = this.objects.get(path);
        if (!obj) subscriber.error(new HtQuickNgxFireError(`Object not found: ${path}`, 'storage/object-not-found'));
        else { subscriber.next(this.metadataFor(path, obj)); subscriber.complete(); }
      });
    });
  }

  getMetadataAsync(path: string): Promise<Record<string, unknown>> {
    return this.deferred(() => {
      const obj = this.objects.get(path);
      if (!obj) throw new HtQuickNgxFireError(`Object not found: ${path}`, 'storage/object-not-found');
      return this.metadataFor(path, obj);
    });
  }

  updateMetadata(path: string, metadata: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.deferred(() => {
      const obj = this.objects.get(path);
      if (!obj) throw new HtQuickNgxFireError(`Object not found: ${path}`, 'storage/object-not-found');
      obj.metadata = { ...obj.metadata, ...metadata };
      return this.metadataFor(path, obj);
    });
  }

  ngOnDestroy(): void {
    for (const url of this.urls.values()) URL.revokeObjectURL(url);
    this.urls.clear();
    this.objects.clear();
  }

  private storeBlob(path: string, blob: Blob, metadata: Record<string, unknown>): void {
    const old = this.urls.get(path);
    if (old) URL.revokeObjectURL(old);
    const url = URL.createObjectURL(blob);
    this.objects.set(path, {
      blob,
      metadata,
      contentType: (metadata['contentType'] as string) ?? blob.type ?? 'application/octet-stream',
    });
    this.urls.set(path, url);
  }

  private toBlob(data: Blob | Uint8Array | ArrayBuffer, metadata?: Record<string, unknown>): Blob {
    if (data instanceof Blob) return data;
    const type = (metadata?.['contentType'] as string) ?? 'application/octet-stream';
    if (data instanceof ArrayBuffer) return new Blob([data], { type });
    return new Blob([data as BlobPart], { type });
  }

  private metadataFor(path: string, obj: SimStorageObject): Record<string, unknown> {
    return {
      ...obj.metadata,
      fullPath: path,
      size: obj.blob.size,
      contentType: obj.contentType,
      updated: new Date().toISOString(),
    };
  }

  private deferred<T>(fn: () => T): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queueMicrotask(() => {
        try { resolve(fn()); } catch (err) { reject(err); }
      });
    });
  }
}
