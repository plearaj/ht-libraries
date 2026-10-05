import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SiteHeader } from './site-header';

describe('SiteHeader', () => {
  async function setup() {
    await TestBed.configureTestingModule({ imports: [SiteHeader], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(SiteHeader);
    fixture.componentRef.setInput('companyName', 'Test Co');
    await fixture.whenStable();
    return fixture;
  }

  it('shows the wordmark linking home', async () => {
    const el: HTMLElement = (await setup()).nativeElement;
    const home = el.querySelector<HTMLAnchorElement>('a.wordmark');
    expect(home?.textContent).toContain('Test Co');
    expect(home?.getAttribute('href')).toBe('/');
  });

  it('renders the main nav links and the Start a project button', async () => {
    const el: HTMLElement = (await setup()).nativeElement;
    const labels = Array.from(el.querySelectorAll('nav[aria-label="Main"] a')).map((a) => a.textContent?.trim());
    expect(labels).toEqual(['Portfolio', 'Services', 'Products', 'About', 'Start a project']);
  });

  it('points the menu button at the drawer and reflects its open state in aria-expanded', async () => {
    const fixture = await setup();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button.menu-button');
    expect(button.getAttribute('aria-controls')).toBe('mobile-menu');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    fixture.componentRef.setInput('menuExpanded', true);
    await fixture.whenStable();
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });

  it('emits menuOpen when the menu button is clicked', async () => {
    const fixture = await setup();
    let opened = false;
    fixture.componentInstance.menuOpen.subscribe(() => (opened = true));
    fixture.nativeElement.querySelector('button.menu-button').click();
    expect(opened).toBeTrue();
  });
});
