import { Component, ChangeDetectionStrategy, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { DatabaseConfig } from '../skill.types';

@Component({
  selector: 'ht-database-input',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './database-input.component.html',
  styleUrl: './database-input.component.scss',
})
export class HtDatabaseInputComponent {
  readonly configSubmitted = output<DatabaseConfig>();

  readonly form = new FormGroup({
    dbType: new FormControl<'postgresql' | 'mysql' | 'sqlite'>('postgresql', { nonNullable: true }),
    connectionString: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    query: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    rowLimit: new FormControl(10000, { nonNullable: true }),
    timeoutSeconds: new FormControl(30, { nonNullable: true }),
  });

  onSubmit(): void {
    if (this.form.invalid) return;
    const val = this.form.getRawValue();
    this.configSubmitted.emit({
      type: 'database',
      dbType: val.dbType,
      connectionString: val.connectionString,
      query: val.query,
      rowLimit: val.rowLimit,
      timeoutSeconds: val.timeoutSeconds,
    });
  }
}
