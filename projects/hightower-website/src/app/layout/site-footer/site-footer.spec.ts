import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FIXTURE_SITE } from '../../content/testing/content-fixtures';
import { SiteFooter } from './site-footer';

describe('SiteFooter', () => {
  it('shows the verse, location and social links', async () => {
    await TestBed.configureTestingModule({ imports: [SiteFooter], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(SiteFooter);
    fixture.componentRef.setInput('site', FIXTURE_SITE);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('blockquote')?.textContent).toContain('A verse.');
    expect(el.textContent).toContain('Book 1:1');
    expect(el.textContent).toContain('Testville, TS');
    expect(el.querySelector<HTMLAnchorElement>('a[href="https://github.com/test"]')?.textContent).toContain('GitHub');
  });

  it('omits the verse when none is configured', async () => {
    await TestBed.configureTestingModule({ imports: [SiteFooter], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(SiteFooter);
    fixture.componentRef.setInput('site', { ...FIXTURE_SITE, footerVerse: undefined });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('blockquote')).toBeNull();
  });
});
