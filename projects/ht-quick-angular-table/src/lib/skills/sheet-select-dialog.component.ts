import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';

/** Data passed to the sheet selection dialog. */
export interface SheetSelectDialogData {
  sheets: string[];
}

@Component({
  selector: 'ht-sheet-select-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatSelectModule, MatFormFieldModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sheet-select-dialog.component.html',
  styleUrl: './sheet-select-dialog.component.scss',
})
export class HtSheetSelectDialogComponent {
  readonly dialogRef = inject(MatDialogRef<HtSheetSelectDialogComponent>);
  readonly data: SheetSelectDialogData = inject(MAT_DIALOG_DATA);
  selectedSheet = this.data.sheets[0] ?? '';
}
