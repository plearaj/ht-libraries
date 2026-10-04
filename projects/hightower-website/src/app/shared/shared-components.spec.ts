import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FIXTURE_PRODUCTS, FIXTURE_PROJECTS } from '../content/testing/content-fixtures';
import { CodeSnippet } from './code-snippet/code-snippet';
import { CtaBand } from './cta-band/cta-band';
import { HtmlContent } from './html-content/html-content';
import { ProductCard } from './product-card/product-card';
import { ProjectCard } from './project-card/project-card';
import { SectionHeading } from './section-heading/section-heading';

async function render<T>(component: Type<T>, inputs: Record<string, unknown>) {
  await TestBed.configureTestingModule({ imports: [component], providers: [provideRouter([])] }).compileComponents();
  const fixture = TestBed.createComponent(component);
  for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('shared components', () => {
  it('SectionHeading renders an h2 by default and an h1 at level 1', async () => {
    const h2 = await render(SectionHeading, { eyebrow: 'What we do', heading: 'Services' });
    expect(h2.querySelector('h2')?.textContent).toBe('Services');
    expect(h2.textContent).toContain('What we do');
    TestBed.resetTestingModule();
    const h1 = await render(SectionHeading, { eyebrow: 'E', heading: 'Title', level: 1 });
    expect(h1.querySelector('h1')?.textContent).toBe('Title');
  });

  it('ProjectCard links a lab to its portfolio page with a LAB tag', async () => {
    const el = await render(ProjectCard, { project: FIXTURE_PROJECTS[0] });
    expect(el.querySelector('a')?.getAttribute('href')).toBe('/portfolio/lab-one');
    expect(el.querySelector('.hs-tag')?.textContent?.trim()).toBe('Lab');
    expect(el.textContent).toContain('Inside the lab');
  });

  it('ProjectCard links a product-kind project to its product page', async () => {
    const el = await render(ProjectCard, { project: FIXTURE_PROJECTS[1] });
    expect(el.querySelector('a')?.getAttribute('href')).toBe('/products/prod-one');
    expect(el.querySelector('.hs-tag')?.classList).toContain('hs-tag--product');
  });

  it('ProjectCard shows a placeholder when there is no image', async () => {
    const el = await render(ProjectCard, { project: FIXTURE_PROJECTS[2] });
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('.hs-placeholder')).not.toBeNull();
  });

  it('ProductCard shows the install command only when set', async () => {
    const lib = await render(ProductCard, { product: FIXTURE_PRODUCTS[1] });
    expect(lib.querySelector('code')?.textContent).toBe('npm i lib-one');
    expect(lib.querySelector('a')?.getAttribute('href')).toBe('/products/lib-one');
    TestBed.resetTestingModule();
    const app = await render(ProductCard, { product: FIXTURE_PRODUCTS[0] });
    expect(app.querySelector('code')).toBeNull();
  });

  it('HtmlContent renders the generated HTML', async () => {
    const el = await render(HtmlContent, { html: '<h2>Hi</h2><p>There</p>' });
    expect(el.querySelector('.prose h2')?.textContent).toBe('Hi');
  });

  it('CodeSnippet shows the code and copies it', async () => {
    const write = spyOn(navigator.clipboard, 'writeText').and.resolveTo();
    const el = await render(CodeSnippet, { code: 'npm i x' });
    expect(el.querySelector('pre')?.textContent).toBe('npm i x');
    el.querySelector<HTMLButtonElement>('button')!.click();
    expect(write).toHaveBeenCalledWith('npm i x');
  });

  it('CtaBand links to contact', async () => {
    const el = await render(CtaBand, { heading: 'Build with us?' });
    expect(el.querySelector('h2')?.textContent).toBe('Build with us?');
    expect(el.querySelector('a')?.getAttribute('href')).toBe('/contact');
  });
});
