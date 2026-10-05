import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import {
  FIXTURE_PRODUCTS,
  FIXTURE_PROJECTS,
  FIXTURE_SERVICES,
  FIXTURE_SITE,
} from '../content/testing/content-fixtures';
import { AboutPage } from './about/about-page';
import { PortfolioPage } from './portfolio/portfolio-page';
import { ProductsPage } from './products/products-page';
import { ServicesPage } from './services/services-page';

async function render<T>(component: Type<T>, inputs: Record<string, unknown>) {
  await TestBed.configureTestingModule({ imports: [component], providers: [provideRouter([])] }).compileComponents();
  const fixture = TestBed.createComponent(component);
  fixture.componentRef.setInput('site', FIXTURE_SITE);
  for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('list pages', () => {
  it('ServicesPage renders each service with its description and a topic link', async () => {
    const el = await render(ServicesPage, { services: [FIXTURE_SERVICES[1], FIXTURE_SERVICES[0]] });
    expect(el.querySelector('h1')?.textContent).toBe('Services');
    expect(Array.from(el.querySelectorAll('article h2')).map((h) => h.textContent)).toEqual(['Custom Development', 'Consulting']);
    expect(el.querySelector('article .prose')?.innerHTML).toContain('<p>D</p>');
    expect(el.querySelector('a[href="/contact?topic=consulting"]')).not.toBeNull();
    expect(TestBed.inject(Title).getTitle()).toBe('Services | Test Co');
  });

  it('PortfolioPage groups projects by kind in lab, product, client order', async () => {
    const el = await render(PortfolioPage, { projects: FIXTURE_PROJECTS });
    expect(Array.from(el.querySelectorAll('.group__heading')).map((h) => h.textContent)).toEqual(['The lab', 'Products', 'Client work']);
    expect(el.querySelectorAll('hs-project-card').length).toBe(4);
  });

  it('ProductsPage groups apps and libraries', async () => {
    const el = await render(ProductsPage, { products: FIXTURE_PRODUCTS });
    expect(Array.from(el.querySelectorAll('.group__heading')).map((h) => h.textContent)).toEqual(['Apps', 'Libraries']);
    expect(el.querySelectorAll('hs-product-card').length).toBe(2);
  });

  it('AboutPage renders an h1 and sets the title', async () => {
    const el = await render(AboutPage, {});
    expect(el.querySelector('h1')?.textContent).toBe('About Test Co');
    expect(TestBed.inject(Title).getTitle()).toBe('About | Test Co');
  });
});
