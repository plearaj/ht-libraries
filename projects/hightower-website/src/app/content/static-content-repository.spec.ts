import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ContentRepository } from './content-repository';
import { provideFixtureContent } from './testing/content-fixtures';

describe('StaticContentRepository', () => {
  let repo: ContentRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideFixtureContent() });
    repo = TestBed.inject(ContentRepository);
  });

  it('returns the site config', async () => {
    expect((await firstValueFrom(repo.site())).companyName).toBe('Test Co');
  });

  it('returns all projects when unfiltered', async () => {
    expect((await firstValueFrom(repo.projects())).length).toBe(4);
  });

  it('filters projects by kind', async () => {
    const clients = await firstValueFrom(repo.projects({ kind: 'client' }));
    expect(clients.map((p) => p.slug)).toEqual(['client-one', 'client-two']);
  });

  it('filters projects by featured', async () => {
    const featured = await firstValueFrom(repo.projects({ featured: true }));
    expect(featured.map((p) => p.slug)).toEqual(['lab-one', 'prod-one', 'client-one']);
  });

  it('finds a project by slug, or undefined', async () => {
    expect((await firstValueFrom(repo.projectBySlug('lab-one')))?.name).toBe('Lab One');
    expect(await firstValueFrom(repo.projectBySlug('nope'))).toBeUndefined();
  });

  it('sorts services by order', async () => {
    const services = await firstValueFrom(repo.services());
    expect(services.map((s) => s.slug)).toEqual(['custom-development', 'consulting']);
  });

  it('filters products by kind and finds by slug', async () => {
    expect((await firstValueFrom(repo.products({ kind: 'library' }))).map((p) => p.slug)).toEqual(['lib-one']);
    expect((await firstValueFrom(repo.productBySlug('prod-one')))?.kind).toBe('app');
    expect(await firstValueFrom(repo.productBySlug('nope'))).toBeUndefined();
  });

  it('lists products produced by a lab', async () => {
    expect((await firstValueFrom(repo.producedBy('lab-one'))).map((p) => p.slug)).toEqual(['prod-one']);
    expect(await firstValueFrom(repo.producedBy('client-one'))).toEqual([]);
  });
});
