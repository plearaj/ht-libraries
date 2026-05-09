import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ExcelUploadConfig } from '../skill.types';

@Component({
  selector: 'ht-excel-input',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './excel-input.component.html',
  styleUrl: './excel-input.component.scss',
})
export class HtExcelInputComponent {
  readonly config = input.required<ExcelUploadConfig>();
  readonly fileSelected = output<File>();

  error = '';

  acceptFormats(): string {
    return this.config().allowedFormats.join(',');
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.add('dragover');
  }

  onDragLeave(event: DragEvent): void {
    (event.currentTarget as HTMLElement).classList.remove('dragover');
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.remove('dragover');
    const file = event.dataTransfer?.files[0];
    if (file) this.validateAndEmit(file);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.validateAndEmit(file);
  }

  private validateAndEmit(file: File): void {
    this.error = '';
    const cfg = this.config();
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!cfg.allowedFormats.includes(ext)) {
      this.error = `Invalid file type. Allowed: ${cfg.allowedFormats.join(', ')}`;
      return;
    }
    if (file.size > cfg.maxFileSizeMb * 1024 * 1024) {
      this.error = `File too large. Maximum: ${cfg.maxFileSizeMb} MB`;
      return;
    }
    this.fileSelected.emit(file);
  }
}
