import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { EMAIL_PATTERN, notBlank, trimmedMinLength } from '../../contact/contact-validators';
import { SubmitResult, contactTopics } from '../../contact/contact.models';
import { ContactService } from '../../contact/contact.service';
import { Service, SiteConfig } from '../../content/models';
import { SeoService } from '../../seo/seo.service';

type FormState = 'idle' | 'submitting' | SubmitResult;
type Field = 'name' | 'email' | 'company' | 'message';

const MESSAGES: Record<Field, Record<string, string>> = {
  name: { required: 'Please enter your name.', blank: 'Please enter your name.', maxlength: 'Name must be 100 characters or fewer.' },
  email: {
    required: 'Please enter your email address.',
    pattern: 'Please enter a valid email address.',
    maxlength: 'Email must be 254 characters or fewer.',
  },
  company: { maxlength: 'Company must be 100 characters or fewer.' },
  message: {
    required: 'Please tell us a little about your project.',
    minLengthTrimmed: 'Please write at least 10 characters.',
    maxlength: 'Message must be 5000 characters or fewer.',
  },
};

@Component({
  selector: 'hs-contact-page',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatRadioModule, MatProgressSpinnerModule],
  templateUrl: './contact-page.html',
  styleUrl: './contact-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactPage {
  readonly site = input.required<SiteConfig>();
  readonly services = input.required<Service[]>();
  readonly topic = input<string | undefined>(); // ?topic= query param

  private readonly contact = inject(ContactService);
  protected readonly state = signal<FormState>('idle');
  protected readonly topics = computed(() => contactTopics(this.services()));

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, notBlank, Validators.maxLength(100)] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(EMAIL_PATTERN), Validators.maxLength(254)],
    }),
    company: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
    topic: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    message: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, trimmedMinLength(10), Validators.maxLength(5000)],
    }),
    honeypot: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    const seo = inject(SeoService);
    effect(() =>
      seo.apply(
        {
          title: 'Contact',
          description: `Tell ${this.site().companyName} what you're building.`,
          path: '/contact',
        },
        this.site(),
      ),
    );
    // Re-runs when ?topic= changes while the router reuses this component
    // (e.g. a CTA link clicked from /contact). Never overrides a visitor's choice.
    effect(() => {
      const values = this.topics().map((t) => t.value);
      const requested = this.topic();
      const control = this.form.controls.topic;
      if (control.dirty) return;
      control.setValue(requested && values.includes(requested) ? requested : values[0]);
    });
  }

  protected errorFor(field: Field): string {
    const errors = this.form.controls[field].errors;
    if (!errors) return '';
    const key = Object.keys(errors).find((k) => MESSAGES[field][k]);
    return key ? MESSAGES[field][key] : '';
  }

  async submit(): Promise<void> {
    if (this.state() === 'submitting') return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.state.set('submitting');
    this.state.set(await this.contact.submit(this.form.getRawValue()));
  }
}
