import { PRODUCTS, PROJECTS, SERVICES, SITE } from './content.generated';
import { Image } from './models';

function duplicates(slugs: string[]): string[] {
  return slugs.filter((slug, i) => slugs.indexOf(slug) !== i);
}

describe('content integrity', () => {
  it('has unique slugs within each collection', () => {
    expect(duplicates(PROJECTS.map((p) => p.slug))).toEqual([]);
    expect(duplicates(PRODUCTS.map((p) => p.slug))).toEqual([]);
    expect(duplicates(SERVICES.map((s) => s.slug))).toEqual([]);
  });

  it('points every producedBy at an existing lab project', () => {
    const labs = PROJECTS.filter((p) => p.kind === 'lab').map((p) => p.slug);
    const broken = PRODUCTS.filter((p) => p.producedBy && !labs.includes(p.producedBy)).map((p) => p.slug);
    expect(broken).toEqual([]);
  });

  it('gives every product-kind project a productSlug that exists', () => {
    const productSlugs = PRODUCTS.map((p) => p.slug);
    const broken = PROJECTS.filter(
      (p) => p.kind === 'product' && (!p.productSlug || !productSlugs.includes(p.productSlug)),
    ).map((p) => p.slug);
    expect(broken).toEqual([]);
  });

  it('gives every image alt text', () => {
    const images: Image[] = [SITE.hero.poster, ...PROJECTS.flatMap((p) => p.images)];
    expect(images.filter((img) => img.alt.trim() === '').map((img) => img.src)).toEqual([]);
  });

  it('uses an absolute siteUrl with no trailing slash', () => {
    expect(SITE.siteUrl).toMatch(/^https:\/\/[^/]+$/);
  });
});
