import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import {
  FIXTURE_PRODUCTS,
  FIXTURE_PROJECTS,
  FIXTURE_SERVICES,
  FIXTURE_SITE,
} from '../../content/testing/content-fixtures';
import { AUTOPLAY_ALLOWED } from '../../shared/hero-video/hero-video';
import { HomePage } from './home-page';

describe('HomePage', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([]), { provide: AUTOPLAY_ALLOWED, useValue: () => false }],
    }).compileComponents();
    const fixture = TestBed.createComponent(HomePage);
    fixture.componentRef.setInput('site', FIXTURE_SITE);
    fixture.componentRef.setInput('home', {
      services: [FIXTURE_SERVICES[1], FIXTURE_SERVICES[0]],
      featured: FIXTURE_PROJECTS.filter((p) => p.featured),
      libraries: FIXTURE_PRODUCTS.filter((p) => p.kind === 'library'),
    });
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the hero headline as the page h1 with CTAs', async () => {
    const el = await setup();
    expect(el.querySelector('h1')?.textContent).toBe('Hero headline');
    expect(el.querySelector('hs-hero-video a[href="/contact"]')).not.toBeNull();
    expect(el.querySelector('hs-hero-video a[href="/portfolio"]')).not.toBeNull();
  });

  it('lists services with contact links preselecting the topic', async () => {
    const el = await setup();
    const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('.services a')).map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/contact?topic=custom-development', '/contact?topic=consulting']);
  });

  it('shows the lab, its products, client work and libraries', async () => {
    const el = await setup();
    expect(el.querySelector('.lab a[href="/portfolio/lab-one"]')).not.toBeNull();
    expect(el.querySelector('.lab a[href="/products/prod-one"]')).not.toBeNull();
    expect(el.querySelector('.clients a[href="/portfolio/client-one"]')).not.toBeNull();
    expect(el.querySelector('.libraries a[href="/products/lib-one"]')).not.toBeNull();
  });

  it('sets the home page title', async () => {
    await setup();
    expect(TestBed.inject(Title).getTitle()).toBe('Test Co | Testing things');
  });
});
