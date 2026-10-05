import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { FIXTURE_PRODUCTS, FIXTURE_PROJECTS, FIXTURE_SITE } from '../content/testing/content-fixtures';
import { NotFoundPage } from './not-found/not-found-page';
import { ProductDetailPage } from './product-detail/product-detail-page';
import { ProjectDetailPage } from './project-detail/project-detail-page';

async function render<T>(component: Type<T>, inputs: Record<string, unknown>) {
  await TestBed.configureTestingModule({ imports: [component], providers: [provideRouter([])] }).compileComponents();
  const fixture = TestBed.createComponent(component);
  fixture.componentRef.setInput('site', FIXTURE_SITE);
  for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('detail pages', () => {
  it('ProjectDetailPage shows a lab with breadcrumb, body and produced products', async () => {
    const lab = { ...FIXTURE_PROJECTS[0], tech: ['Angular'], links: [{ label: 'Demo', url: 'https://demo.dev' }] };
    const el = await render(ProjectDetailPage, { detail: { project: lab, produced: [FIXTURE_PRODUCTS[0]] } });
    expect(el.querySelector('h1')?.textContent).toBe('Lab One');
    expect(el.querySelector('nav[aria-label="Breadcrumb"] a')?.getAttribute('href')).toBe('/portfolio');
    expect(el.querySelector('.prose')?.innerHTML).toContain('<p>Body</p>');
    expect(el.textContent).toContain('Angular');
    expect(el.querySelector<HTMLAnchorElement>('a[href="https://demo.dev"]')?.rel).toBe('noopener noreferrer');
    expect(el.querySelector('.produced hs-product-card')).not.toBeNull();
    expect(el.textContent).toContain('In the lab now');
    expect(TestBed.inject(Title).getTitle()).toBe('Lab One | Test Co');
  });

  it('ProjectDetailPage hides the produced section for client projects and shows the client', async () => {
    const el = await render(ProjectDetailPage, { detail: { project: FIXTURE_PROJECTS[2], produced: [] } });
    expect(el.querySelector('.produced')).toBeNull();
    expect(el.textContent).toContain('Client One Inc');
  });

  it('ProductDetailPage shows install, repo link and produced-by lab', async () => {
    const el = await render(ProductDetailPage, { detail: { product: FIXTURE_PRODUCTS[1], lab: undefined } });
    expect(el.querySelector('h1')?.textContent).toBe('lib-one');
    expect(el.querySelector('hs-code-snippet pre')?.textContent).toBe('npm i lib-one');
    expect(el.querySelector('a[href="https://github.com/test/lib-one"]')).not.toBeNull();
    TestBed.resetTestingModule();
    const app = await render(ProductDetailPage, { detail: { product: FIXTURE_PRODUCTS[0], lab: FIXTURE_PROJECTS[0] } });
    expect(app.querySelector('hs-code-snippet')).toBeNull();
    expect(app.querySelector('a[href="/portfolio/lab-one"]')?.textContent).toContain('Lab One');
  });

  it('NotFoundPage links home and is noindex', async () => {
    const el = await render(NotFoundPage, {});
    expect(el.querySelector('h1')?.textContent).toBe('Page not found');
    expect(el.querySelector('a[href="/"]')).not.toBeNull();
    expect(TestBed.inject(Meta).getTag('name="robots"')?.content).toBe('noindex');
  });
});
