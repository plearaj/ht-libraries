import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ContactService } from '../../contact/contact.service';
import { SubmitResult } from '../../contact/contact.models';
import { FIXTURE_SERVICES, FIXTURE_SITE } from '../../content/testing/content-fixtures';
import { ContactPage } from './contact-page';

const VALID = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  company: '',
  topic: 'consulting',
  message: 'I would like to talk about a project.',
  honeypot: '',
};

describe('ContactPage', () => {
  let submit: jasmine.Spy<(v: unknown) => Promise<SubmitResult>>;

  async function setup(topic?: string): Promise<ComponentFixture<ContactPage>> {
    submit = jasmine.createSpy('submit').and.resolveTo('sent');
    await TestBed.configureTestingModule({
      imports: [ContactPage],
      providers: [provideRouter([]), { provide: ContactService, useValue: { submit } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(ContactPage);
    fixture.componentRef.setInput('site', FIXTURE_SITE);
    fixture.componentRef.setInput('services', [FIXTURE_SERVICES[1], FIXTURE_SERVICES[0]]);
    if (topic !== undefined) fixture.componentRef.setInput('topic', topic);
    await fixture.whenStable();
    return fixture;
  }

  const el = (f: ComponentFixture<ContactPage>) => f.nativeElement as HTMLElement;

  it('preselects the topic from the query param', async () => {
    const f = await setup('consulting');
    expect(f.componentInstance.form.controls.topic.value).toBe('consulting');
  });

  it('falls back to the first service for a missing or unknown topic', async () => {
    const f = await setup('pizza');
    expect(f.componentInstance.form.controls.topic.value).toBe('custom-development');
  });

  it('follows a ?topic= change while the component is reused', async () => {
    const f = await setup('consulting');
    f.componentRef.setInput('topic', 'other');
    await f.whenStable();
    expect(f.componentInstance.form.controls.topic.value).toBe('other');
  });

  it('keeps the visitor\'s own topic choice when ?topic= changes', async () => {
    const f = await setup('consulting');
    f.componentInstance.form.controls.topic.setValue('product');
    f.componentInstance.form.controls.topic.markAsDirty();
    f.componentRef.setInput('topic', 'other');
    await f.whenStable();
    expect(f.componentInstance.form.controls.topic.value).toBe('product');
  });

  it('lists the service topics plus product and other', async () => {
    const labels = Array.from(el(await setup()).querySelectorAll('mat-radio-button')).map((r) => r.textContent?.trim());
    expect(labels).toEqual(['Custom Development', 'Consulting', 'A product or library', 'Something else']);
  });

  it('shows errors and does not submit an empty form', async () => {
    const f = await setup();
    await f.componentInstance.submit();
    f.detectChanges(); // touched state isn't a signal the template reads, so zoneless CD needs a nudge
    await f.whenStable();
    expect(submit).not.toHaveBeenCalled();
    expect(el(f).textContent).toContain('Please enter your name.');
    expect(el(f).textContent).toContain('Please enter your email address.');
  });

  it('rejects a whitespace-only name and an email without a dot in the domain', async () => {
    const f = await setup();
    f.componentInstance.form.setValue({ ...VALID, name: '   ', email: 'ada@example' });
    expect(f.componentInstance.form.controls.name.hasError('blank')).toBeTrue();
    expect(f.componentInstance.form.controls.email.hasError('pattern')).toBeTrue();
  });

  it('rejects a message under 10 characters after trimming', async () => {
    const f = await setup();
    f.componentInstance.form.controls.message.setValue('   short   ');
    expect(f.componentInstance.form.controls.message.hasError('minLengthTrimmed')).toBeTrue();
  });

  it('submits and replaces the form with a thank-you', async () => {
    const f = await setup();
    f.componentInstance.form.setValue(VALID);
    await f.componentInstance.submit();
    await f.whenStable();
    expect(submit).toHaveBeenCalledOnceWith(VALID);
    expect(el(f).querySelector('form')).toBeNull();
    expect(el(f).textContent).toContain('Thank you');
    expect(el(f).textContent).toContain('two business days');
  });

  it('keeps input and shows the email fallback on failure', async () => {
    const f = await setup();
    submit.and.resolveTo('failed');
    f.componentInstance.form.setValue(VALID);
    await f.componentInstance.submit();
    await f.whenStable();
    expect(el(f).querySelector('form')).not.toBeNull();
    expect(f.componentInstance.form.controls.message.value).toBe(VALID.message);
    expect(el(f).querySelector('[role="status"]')?.textContent).toContain('hi@test.example');
  });

  it('shows an offline message', async () => {
    const f = await setup();
    submit.and.resolveTo('offline');
    f.componentInstance.form.setValue(VALID);
    await f.componentInstance.submit();
    await f.whenStable();
    expect(el(f).querySelector('[role="status"]')?.textContent).toContain('offline');
  });

  it('disables the button while submitting', async () => {
    const f = await setup();
    let finish!: (r: SubmitResult) => void;
    submit.and.returnValue(new Promise<SubmitResult>((resolve) => (finish = resolve)));
    f.componentInstance.form.setValue(VALID);
    const pending = f.componentInstance.submit();
    await f.whenStable();
    expect(el(f).querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBeTrue();
    finish('sent');
    await pending;
  });

  it('renders the honeypot off-screen, out of tab order and hidden from assistive tech', async () => {
    const hp = el(await setup()).querySelector<HTMLInputElement>('#hp_field_x')!;
    expect(hp.tabIndex).toBe(-1);
    expect(hp.getAttribute('autocomplete')).toBe('off');
    expect(hp.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
