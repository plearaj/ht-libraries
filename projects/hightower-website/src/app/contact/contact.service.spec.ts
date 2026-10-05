import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FIXTURE_SERVICES } from '../content/testing/content-fixtures';
import { ContactFormValue, contactTopics, toSubmission } from './contact.models';
import { CONTACT_TIMEOUT_MS, ContactService } from './contact.service';
import { SubmissionWriter } from './submission-writer';

const VALUE: ContactFormValue = {
  name: '  Ada Lovelace ',
  email: ' ada@example.com ',
  company: '   ',
  topic: 'consulting',
  message: '  I would like to talk about a project.  ',
  honeypot: '',
};

describe('toSubmission', () => {
  it('trims fields and omits an empty company', () => {
    expect(toSubmission(VALUE)).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      topic: 'consulting',
      message: 'I would like to talk about a project.',
    });
  });

  it('keeps a non-empty company', () => {
    expect(toSubmission({ ...VALUE, company: ' Engines ' }).company).toBe('Engines');
  });
});

describe('contactTopics', () => {
  it('lists the given services in order, then product and other', () => {
    expect(contactTopics([FIXTURE_SERVICES[1], FIXTURE_SERVICES[0]])).toEqual([
      { value: 'custom-development', label: 'Custom Development' },
      { value: 'consulting', label: 'Consulting' },
      { value: 'product', label: 'A product or library' },
      { value: 'other', label: 'Something else' },
    ]);
  });
});

describe('ContactService', () => {
  let write: jasmine.Spy<(data: unknown) => Promise<void>>;

  function setup(platform = 'browser') {
    write = jasmine.createSpy('write').and.resolveTo();
    TestBed.configureTestingModule({
      providers: [
        { provide: SubmissionWriter, useValue: { write } },
        { provide: PLATFORM_ID, useValue: platform },
      ],
    });
    return TestBed.inject(ContactService);
  }

  afterEach(() => jasmine.clock().uninstall());

  it('writes the trimmed submission and reports sent', async () => {
    const service = setup();
    expect(await service.submit(VALUE)).toBe('sent');
    expect(write).toHaveBeenCalledOnceWith(toSubmission(VALUE));
  });

  it('silently succeeds without writing when the honeypot is filled', async () => {
    const service = setup();
    expect(await service.submit({ ...VALUE, honeypot: 'http://spam' })).toBe('sent');
    expect(write).not.toHaveBeenCalled();
  });

  it('reports offline without writing when the browser is offline', async () => {
    const service = setup();
    spyOnProperty(navigator, 'onLine').and.returnValue(false);
    expect(await service.submit(VALUE)).toBe('offline');
    expect(write).not.toHaveBeenCalled();
  });

  it('reports failed when the write rejects', async () => {
    const service = setup();
    write.and.rejectWith(new Error('permission-denied'));
    expect(await service.submit(VALUE)).toBe('failed');
  });

  it('reports failed when the write takes longer than the timeout', async () => {
    const service = setup();
    jasmine.clock().install();
    write.and.returnValue(new Promise<void>(() => undefined));
    const result = service.submit(VALUE);
    jasmine.clock().tick(CONTACT_TIMEOUT_MS);
    expect(await result).toBe('failed');
    expect(CONTACT_TIMEOUT_MS).toBe(15000);
  });

  it('never writes on the server', async () => {
    const service = setup('server');
    expect(await service.submit(VALUE)).toBe('failed');
    expect(write).not.toHaveBeenCalled();
  });
});
