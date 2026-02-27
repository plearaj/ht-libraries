import { Observable } from 'rxjs';

export interface CapturedImage {
  /** Raw File object (browser path) or a synthetic File from base64 (Capacitor path) */
  file: File;
  /** Data URL for immediate preview (always populated) */
  dataUrl: string;
  /** Pixel width after any resizing; undefined if not processed */
  width?: number;
  /** Pixel height after any resizing; undefined if not processed */
  height?: number;
  /** MIME type, e.g. 'image/jpeg' */
  mimeType: string;
  /** Source that produced the image */
  source: 'camera' | 'file' | 'gallery';
}

export interface UploadProgress {
  type: 'progress';
  /** 0–100 */
  percent: number;
  /** Bytes transferred so far */
  bytesTransferred: number;
  /** Total bytes to transfer */
  totalBytes: number;
}

export interface UploadResult<T> {
  type: 'complete';
  /** The remote reference returned by the backend (URL, path, ID, etc.) */
  ref: T;
}

export type UploadHandler<T> = (
  image: CapturedImage
) => Observable<UploadProgress | UploadResult<T>>;

export interface UploadConfig<T> {
  /** Consumer-supplied function that performs the actual upload */
  handler: UploadHandler<T>;
  /** Maximum file size in bytes; library rejects before calling handler if exceeded */
  maxSizeBytes?: number;
  /** Allowed MIME types; library rejects before calling handler if not matched */
  allowedTypes?: string[];
}
