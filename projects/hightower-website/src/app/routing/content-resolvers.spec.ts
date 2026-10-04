import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  RedirectCommand,
  Router,
  RouterStateSnapshot,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { Observable, firstValueFrom, isObservable, of } from 'rxjs';
import { provideFixtureContent } from '../content/testing/content-fixtures';
import {
  ProductDetail,
  ProjectDetail,
  homeResolver,
  productDetailResolver,
  projectDetailResolver,
} from './content-resolvers';

function route(slug?: string): ActivatedRouteSnapshot {
  return { paramMap: convertToParamMap(slug ? { slug } : {}) } as ActivatedRouteSnapshot;
}

async function run<T>(fn: () => unknown): Promise<T | RedirectCommand> {
  const result = TestBed.runInInjectionContext(fn);
  return firstValueFrom(isObservable(result) ? (result as Observable<T>) : of(result as T));
}

describe('content resolvers', () => {
  const state = {} as RouterStateSnapshot;

  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([]), ...provideFixtureContent()] }));

  it('homeResolver gathers services, featured projects and libraries', async () => {
    const home = (await run(() => homeResolver(route(), state))) as { services: { slug: string }[]; featured: { slug: string }[]; libraries: { slug: string }[] };
    expect(home.services.map((s) => s.slug)).toEqual(['custom-development', 'consulting']);
    expect(home.featured.map((p) => p.slug)).toEqual(['lab-one', 'prod-one', 'client-one']);
    expect(home.libraries.map((p) => p.slug)).toEqual(['lib-one']);
  });

  it('projectDetailResolver returns a lab with what it produced', async () => {
    const detail = (await run<ProjectDetail>(() => projectDetailResolver(route('lab-one'), state))) as ProjectDetail;
    expect(detail.project.slug).toBe('lab-one');
    expect(detail.produced.map((p) => p.slug)).toEqual(['prod-one']);
  });

  it('projectDetailResolver returns a client project with nothing produced', async () => {
    const detail = (await run<ProjectDetail>(() => projectDetailResolver(route('client-one'), state))) as ProjectDetail;
    expect(detail.project.slug).toBe('client-one');
    expect(detail.produced).toEqual([]);
  });

  it('projectDetailResolver redirects unknown slugs to /not-found without changing the URL', async () => {
    const result = await run(() => projectDetailResolver(route('nope'), state));
    expect(result).toBeInstanceOf(RedirectCommand);
    const command = result as RedirectCommand;
    expect(TestBed.inject(Router).serializeUrl(command.redirectTo)).toBe('/not-found');
    expect(command.navigationBehaviorOptions?.skipLocationChange).toBeTrue();
  });

  it('projectDetailResolver redirects product-kind projects to their product page', async () => {
    const result = await run(() => projectDetailResolver(route('prod-one'), state));
    expect(result).toBeInstanceOf(RedirectCommand);
    expect(TestBed.inject(Router).serializeUrl((result as RedirectCommand).redirectTo)).toBe('/products/prod-one');
  });

  it('productDetailResolver returns the product and the lab that produced it', async () => {
    const detail = (await run<ProductDetail>(() => productDetailResolver(route('prod-one'), state))) as ProductDetail;
    expect(detail.product.slug).toBe('prod-one');
    expect(detail.lab?.slug).toBe('lab-one');
  });

  it('productDetailResolver returns no lab for a library', async () => {
    const detail = (await run<ProductDetail>(() => productDetailResolver(route('lib-one'), state))) as ProductDetail;
    expect(detail.lab).toBeUndefined();
  });

  it('productDetailResolver redirects unknown slugs to /not-found without changing the URL', async () => {
    const result = (await run(() => productDetailResolver(route('nope'), state))) as RedirectCommand;
    expect(TestBed.inject(Router).serializeUrl(result.redirectTo)).toBe('/not-found');
    expect(result.navigationBehaviorOptions?.skipLocationChange).toBeTrue();
  });
});
