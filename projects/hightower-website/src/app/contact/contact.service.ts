import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { ContactFormValue, SubmitResult, toSubmission } from './contact.models';
import { SubmissionWriter } from './submission-writer';

export const CONTACT_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly writer = inject(SubmissionWriter);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  async submit(value: ContactFormValue): Promise<SubmitResult> {
    if (!this.isBrowser) return 'failed';
    if (value.honeypot.trim() !== '') return 'sent'; // bot: pretend success, write nothing
    if (navigator.onLine === false) return 'offline';
    try {
      await withTimeout(this.writer.write(toSubmission(value)), CONTACT_TIMEOUT_MS);
      return 'sent';
    } catch {
      return 'failed';
    }
  }
}
