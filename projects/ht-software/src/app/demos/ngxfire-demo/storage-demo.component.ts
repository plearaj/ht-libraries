import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, JsonPipe } from '@angular/common';
import { HtStorageService } from 'ht-quick-ngxfire';

@Component({
  selector: 'app-storage-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="demo-section">
      <h2>Cloud Storage</h2>

      <!-- Upload File -->
      <div class="feature-group">
        <h3>Upload File</h3>
        <input type="file" (change)="onFileSelected($event)" class="input" />
        <button class="btn btn-primary" [disabled]="!selectedFile() || uploading()" (click)="uploadFile()">
          Upload
        </button>

        @if (uploading()) {
          <div class="progress-bar-container">
            <div class="progress-bar" [style.width.%]="uploadProgress()"></div>
          </div>
          <span class="progress-label">{{ uploadProgress() | number:'1.0-0' }}%</span>
        }
      </div>

      <!-- Upload String -->
      <div class="feature-group">
        <h3>Upload String (Base64 Text)</h3>
        <textarea [(ngModel)]="textContent" class="input textarea" placeholder="Enter text to upload as a file..."></textarea>
        <button class="btn btn-accent" (click)="uploadString()">Upload as Text File</button>
      </div>

      <!-- Download URL -->
      <div class="feature-group">
        <h3>Get Download URL</h3>
        <input [(ngModel)]="downloadPath" placeholder="File path (e.g. demo/file.txt)" class="input input-wide" />
        <button class="btn btn-info" (click)="getDownloadUrl()">Get URL</button>
        @if (downloadUrl()) {
          <div class="url-display">
            <a [href]="downloadUrl()" target="_blank" rel="noopener">{{ downloadUrl() }}</a>
          </div>
        }
      </div>

      <!-- File Metadata -->
      <div class="feature-group">
        <h3>File Metadata</h3>
        <input [(ngModel)]="metadataPath" placeholder="File path" class="input input-wide" />
        <button class="btn btn-info" (click)="getMetadata()">Get Metadata</button>
        @if (metadata()) {
          <pre class="metadata-display">{{ metadata() | json }}</pre>
        }
      </div>

      <!-- Delete File -->
      <div class="feature-group">
        <h3>Delete File</h3>
        <input [(ngModel)]="deletePath" placeholder="File path" class="input input-wide" />
        <button class="btn btn-danger" (click)="deleteFile()">Delete</button>
      </div>

      <!-- List Files -->
      <div class="feature-group">
        <h3>List Files</h3>
        <input [(ngModel)]="listPath" placeholder="Folder path (e.g. demo/)" class="input input-wide" />
        <button class="btn btn-info" (click)="listFiles()">List</button>
        @if (fileList().length > 0) {
          <ul class="file-list">
            @for (file of fileList(); track file) {
              <li>{{ file }}</li>
            }
          </ul>
        }
      </div>

      @if (message()) {
        <div class="message" [class.error]="messageType() === 'error'" [class.success]="messageType() === 'success'">
          {{ message() }}
        </div>
      }
    </section>
  `,
  styles: [`
    .demo-section { margin: 1.5rem 0; padding: 1.5rem; border: 1px solid #333; border-radius: 8px; background: #1a1a1a; }
    .feature-group { margin-bottom: 1.5rem; }
    .input { padding: 0.5rem; margin-right: 0.5rem; border: 1px solid #444; border-radius: 4px; background: #222; color: #e0e0e0; }
    .input-wide { width: 300px; }
    .textarea { width: 100%; min-height: 60px; resize: vertical; display: block; margin-bottom: 0.5rem; }
    .btn { padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer; color: white; margin-right: 0.5rem; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary { background: #2e7d32; }
    .btn-danger { background: #c62828; }
    .btn-accent { background: #6a1b9a; }
    .btn-info { background: #00838f; }
    .progress-bar-container { display: inline-block; width: 200px; height: 12px; background: #333; border-radius: 6px; overflow: hidden; margin: 0 0.5rem; vertical-align: middle; }
    .progress-bar { height: 100%; background: #4caf50; transition: width 0.2s; }
    .progress-label { font-size: 0.85rem; font-weight: 600; color: #d4af37; }
    .url-display { margin-top: 0.5rem; word-break: break-all; font-size: 0.85rem; background: #1e2a1e; padding: 0.5rem; border-radius: 4px; }
    .url-display a { color: #4caf50; }
    .metadata-display { background: #222; padding: 0.75rem; border-radius: 4px; font-size: 0.8rem; max-height: 200px; overflow: auto; color: #aaa; }
    .file-list { margin-top: 0.5rem; padding-left: 1.25rem; }
    .file-list li { font-size: 0.85rem; margin: 0.2rem 0; color: #ccc; }
    .message { padding: 0.75rem; border-radius: 6px; margin: 0.75rem 0; }
    .message.success { background: #1b3a1b; border: 1px solid #2e7d32; color: #a5d6a7; }
    .message.error { background: #3a1b1b; border: 1px solid #c62828; color: #ef9a9a; }
  `],
  imports: [FormsModule, DecimalPipe, JsonPipe],
})
export class StorageDemoComponent {
  private storageService = inject(HtStorageService);

  selectedFile = signal<File | null>(null);
  uploading = signal(false);
  uploadProgress = signal(0);
  textContent = '';
  downloadPath = '';
  downloadUrl = signal('');
  metadataPath = '';
  metadata = signal<Record<string, unknown> | null>(null);
  deletePath = '';
  listPath = 'demo/';
  fileList = signal<string[]>([]);
  message = signal('');
  messageType = signal<'success' | 'error'>('success');

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
  }

  async uploadFile(): Promise<void> {
    const file = this.selectedFile();
    if (!file) return;

    this.uploading.set(true);
    this.uploadProgress.set(0);

    try {
      const path = `demo/${Date.now()}_${file.name}`;
      const url = await this.storageService.uploadWithProgress(
        path,
        file,
        { contentType: file.type },
        (progress) => this.uploadProgress.set(progress)
      );
      this.downloadUrl.set(url);
      this.downloadPath = path;
      this.showMessage(`Uploaded to ${path}`, 'success');
    } catch (e: unknown) {
      this.showMessage((e as Error).message, 'error');
    } finally {
      this.uploading.set(false);
    }
  }

  async uploadString(): Promise<void> {
    if (!this.textContent.trim()) { this.showMessage('Enter text content', 'error'); return; }
    try {
      const path = `demo/${Date.now()}_text.txt`;
      // Encode to base64 for upload
      const base64 = btoa(this.textContent);
      await this.storageService.uploadString(path, base64, 'base64', { contentType: 'text/plain' });
      this.showMessage(`String uploaded to ${path}`, 'success');
      this.textContent = '';
    } catch (e: unknown) {
      this.showMessage((e as Error).message, 'error');
    }
  }

  async getDownloadUrl(): Promise<void> {
    if (!this.downloadPath.trim()) { this.showMessage('Enter a file path', 'error'); return; }
    try {
      const url = await this.storageService.getDownloadURLAsync(this.downloadPath);
      this.downloadUrl.set(url);
    } catch (e: unknown) {
      this.showMessage((e as Error).message, 'error');
    }
  }

  async getMetadata(): Promise<void> {
    if (!this.metadataPath.trim()) { this.showMessage('Enter a file path', 'error'); return; }
    try {
      const meta = await this.storageService.getMetadataAsync(this.metadataPath);
      this.metadata.set(meta as unknown as Record<string, unknown>);
    } catch (e: unknown) {
      this.showMessage((e as Error).message, 'error');
    }
  }

  async deleteFile(): Promise<void> {
    if (!this.deletePath.trim()) { this.showMessage('Enter a file path', 'error'); return; }
    try {
      await this.storageService.deleteFile(this.deletePath);
      this.showMessage(`Deleted ${this.deletePath}`, 'success');
      this.deletePath = '';
    } catch (e: unknown) {
      this.showMessage((e as Error).message, 'error');
    }
  }

  async listFiles(): Promise<void> {
    if (!this.listPath.trim()) { this.showMessage('Enter a folder path', 'error'); return; }
    try {
      const result = await this.storageService.listAll(this.listPath);
      const names = [
        ...result.prefixes.map(p => p.fullPath + '/'),
        ...result.items.map(i => i.fullPath),
      ];
      this.fileList.set(names);
      this.showMessage(`Found ${names.length} items`, 'success');
    } catch (e: unknown) {
      this.showMessage((e as Error).message, 'error');
    }
  }

  private showMessage(msg: string, type: 'success' | 'error'): void {
    this.message.set(msg);
    this.messageType.set(type);
    setTimeout(() => this.message.set(''), 4000);
  }
}
