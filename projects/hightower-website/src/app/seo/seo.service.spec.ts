import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { FIXTURE_SITE } from '../content/testing/content-fixtures';
import { SeoService, absoluteUrl } from './seo.service';

describe('absoluteUrl', () => {
  it('joins the site origin and path with no trailing slash', () => {
    expect(absoluteUrl('https://a.dev', '/about')).toBe('https://a.dev/about');
    expect(absoluteUrl('https://a.dev/', '/about/')).toBe('https://a.dev/about');
    expect(absoluteUrl('https://a.dev', '/')).toBe('https://a.dev/');
  });

  it('leaves absolute URLs alone', () => {
    expect(absoluteUrl('https://a.dev', 'https://cdn.dev/x.png')).toBe('https://cdn.dev/x.png');
  });
});

describe('SeoService', () => {
  let seo: SeoService;
  let meta: Meta;
  let doc: Document;

  beforeEach(() => {
    seo = TestBed.inject(SeoService);
    meta = TestBed.inject(Meta);
    doc = TestBed.inject(DOCUMENT);
  });

  afterEach(() => doc.head.querySelector('link[rel="canonical"]')?.remove());

  it('sets title, description, OpenGraph and canonical for an inner page', () => {
    seo.apply({ title: 'About', description: 'Who we are.', path: '/about' }, FIXTURE_SITE);

    expect(TestBed.inject(Title).getTitle()).toBe('About | Test Co');
    expect(meta.getTag('name="description"')?.content).toBe('Who we are.');
    expect(meta.getTag('property="og:title"')?.content).toBe('About | Test Co');
    expect(meta.getTag('property="og:url"')?.content).toBe('https://test.example/about');
    expect(meta.getTag('property="og:image"')?.content).toBe('https://test.example/images/og-default.png');
    expect(meta.getTag('name="twitter:card"')?.content).toBe('summary_large_image');
    expect(meta.getTag('name="twitter:title"')?.content).toBe('About | Test Co');
    expect(meta.getTag('name="twitter:description"')?.content).toBe('Who we are.');
    expect(meta.getTag('name="twitter:image"')?.content).toBe('https://test.example/images/og-default.png');
    expect(doc.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://test.example/about');
  });

  it('puts the company name first on the home page and uses a page image when given', () => {
    seo.apply({ title: 'Testing things', description: 'D', path: '/', image: '/images/x.webp' }, FIXTURE_SITE);
    expect(TestBed.inject(Title).getTitle()).toBe('Test Co | Testing things');
    expect(meta.getTag('property="og:image"')?.content).toBe('https://test.example/images/x.webp');
    expect(doc.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://test.example/');
  });

  it('adds noindex only when asked and removes it afterwards', () => {
    seo.apply({ title: 'Not found', description: 'D', path: '/not-found', noindex: true }, FIXTURE_SITE);
    expect(meta.getTag('name="robots"')?.content).toBe('noindex');
    seo.apply({ title: 'About', description: 'D', path: '/about' }, FIXTURE_SITE);
    expect(meta.getTag('name="robots"')).toBeNull();
  });

  it('emits no canonical link for noindex pages and removes an existing one', () => {
    seo.apply({ title: 'A', description: 'D', path: '/a' }, FIXTURE_SITE);
    expect(doc.head.querySelector('link[rel="canonical"]')).not.toBeNull();
    seo.apply({ title: 'Not found', description: 'D', path: '/not-found', noindex: true }, FIXTURE_SITE);
    expect(doc.head.querySelector('link[rel="canonical"]')).toBeNull();
  });

  it('reuses a single canonical link element', () => {
    seo.apply({ title: 'A', description: 'D', path: '/a' }, FIXTURE_SITE);
    seo.apply({ title: 'B', description: 'D', path: '/b' }, FIXTURE_SITE);
    expect(doc.head.querySelectorAll('link[rel="canonical"]').length).toBe(1);
  });
});
