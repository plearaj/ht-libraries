import { Provider } from '@angular/core';
import { ContentRepository } from '../content-repository';
import { Product, Project, Service, SiteConfig } from '../models';
import { CONTENT_DATA, StaticContentRepository } from '../static-content-repository';

export const FIXTURE_SITE: SiteConfig = {
  companyName: 'Test Co',
  siteUrl: 'https://test.example',
  tagline: 'Testing things',
  email: 'hi@test.example',
  location: 'Testville, TS',
  socials: [{ label: 'GitHub', url: 'https://github.com/test' }],
  defaultOgImage: '/images/og-default.png',
  responseTime: 'two business days',
  footerVerse: { text: 'A verse.', reference: 'Book 1:1' },
  hero: {
    headline: 'Hero headline',
    lead: 'Hero lead.',
    poster: { src: '/images/poster.webp', alt: 'Poster alt' },
    videoSources: [],
  },
};

const base = { tagline: 'Tagline', summary: 'Summary', descriptionHtml: '<p>Body</p>', tech: [], links: [], images: [] };

export const FIXTURE_PROJECTS: Project[] = [
  { ...base, slug: 'lab-one', kind: 'lab', name: 'Lab One', status: 'in-progress', featured: true },
  { ...base, slug: 'prod-one', kind: 'product', name: 'Prod One', status: 'live', featured: true, productSlug: 'prod-one' },
  { ...base, slug: 'client-one', kind: 'client', name: 'Client One', client: 'Client One Inc', status: 'live', featured: true },
  { ...base, slug: 'client-two', kind: 'client', name: 'Client Two', status: 'concept', featured: false },
];

export const FIXTURE_PRODUCTS: Product[] = [
  { slug: 'prod-one', kind: 'app', name: 'Prod One', summary: 'An app', descriptionHtml: '<p>App</p>', producedBy: 'lab-one', status: 'live' },
  { slug: 'lib-one', kind: 'library', name: 'lib-one', summary: 'A library', descriptionHtml: '<p>Lib</p>', install: 'npm i lib-one', repoUrl: 'https://github.com/test/lib-one', status: 'live' },
];

export const FIXTURE_SERVICES: Service[] = [
  { slug: 'consulting', name: 'Consulting', summary: 'Advice', descriptionHtml: '<p>C</p>', order: 2 },
  { slug: 'custom-development', name: 'Custom Development', summary: 'Builds', descriptionHtml: '<p>D</p>', order: 1 },
];

export function provideFixtureContent(): Provider[] {
  return [
    {
      provide: CONTENT_DATA,
      useValue: { site: FIXTURE_SITE, projects: FIXTURE_PROJECTS, products: FIXTURE_PRODUCTS, services: FIXTURE_SERVICES },
    },
    { provide: ContentRepository, useClass: StaticContentRepository },
  ];
}
