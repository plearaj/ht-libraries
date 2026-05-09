import { Component, ChangeDetectionStrategy, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { ApiPullConfig } from '../skill.types';

@Component({
  selector: 'ht-api-input',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './api-input.component.html',
  styleUrl: './api-input.component.scss',
})
export class HtApiInputComponent {
  readonly configSubmitted = output<ApiPullConfig>();

  readonly form = new FormGroup({
    url: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    method: new FormControl<'GET' | 'POST'>('GET', { nonNullable: true }),
    headers: new FormControl('', { nonNullable: true }),
    jsonPath: new FormControl('', { nonNullable: true }),
  });

  onSubmit(): void {
    if (this.form.invalid) return;
    const val = this.form.getRawValue();
    let headers: Record<string, string> | undefined;
    if (val.headers.trim()) {
      try {
        headers = JSON.parse(val.headers);
      } catch {
        return; // Invalid JSON — ignore
      }
    }
    this.configSubmitted.emit({
      type: 'api-pull',
      url: val.url,
      method: val.method,
      headers,
      jsonPath: val.jsonPath || undefined,
    });
  }
}
