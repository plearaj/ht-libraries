import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Must match the regex in firestore.rules. */
export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Non-empty but whitespace-only. Empty values are left to Validators.required. */
export const notBlank: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  return typeof value === 'string' && value.length > 0 && value.trim().length === 0 ? { blank: true } : null;
};

export function trimmedMinLength(min: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (typeof value !== 'string' || value.length === 0) return null;
    const length = value.trim().length;
    return length < min ? { minLengthTrimmed: { requiredLength: min, actualLength: length } } : null;
  };
}
