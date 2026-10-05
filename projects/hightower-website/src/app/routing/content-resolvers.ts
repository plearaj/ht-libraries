import { inject } from '@angular/core';
import { RedirectCommand, ResolveFn, Router } from '@angular/router';
import { Observable, forkJoin, map, of, switchMap, take } from 'rxjs';
import { ContentRepository } from '../content/content-repository';
import { Product, Project, Service, SiteConfig } from '../content/models';

export interface HomeData {
  services: Service[];
  featured: Project[];
  libraries: Product[];
}

export interface ProjectDetail {
  project: Project;
  produced: Product[];
}

export interface ProductDetail {
  product: Product;
  lab: Project | undefined;
}

function notFound(router: Router): RedirectCommand {
  return new RedirectCommand(router.parseUrl('/not-found'), { skipLocationChange: true });
}

export const siteResolver: ResolveFn<SiteConfig> = () => inject(ContentRepository).site().pipe(take(1));

export const homeResolver: ResolveFn<HomeData> = () => {
  const repo = inject(ContentRepository);
  return forkJoin({
    services: repo.services().pipe(take(1)),
    featured: repo.projects({ featured: true }).pipe(take(1)),
    libraries: repo.products({ kind: 'library' }).pipe(take(1)),
  });
};

export const servicesResolver: ResolveFn<Service[]> = () => inject(ContentRepository).services().pipe(take(1));

export const projectsResolver: ResolveFn<Project[]> = () => inject(ContentRepository).projects().pipe(take(1));

export const productsResolver: ResolveFn<Product[]> = () => inject(ContentRepository).products().pipe(take(1));

export const projectDetailResolver: ResolveFn<ProjectDetail> = (route) => {
  const repo = inject(ContentRepository);
  const router = inject(Router);
  return repo.projectBySlug(route.paramMap.get('slug') ?? '').pipe(
    take(1),
    switchMap((project): Observable<ProjectDetail | RedirectCommand> => {
      if (!project) return of(notFound(router));
      if (project.kind === 'product') {
        return of(
          project.productSlug
            ? new RedirectCommand(router.parseUrl(`/products/${project.productSlug}`))
            : notFound(router),
        );
      }
      if (project.kind !== 'lab') return of({ project, produced: [] });
      return repo.producedBy(project.slug).pipe(take(1), map((produced) => ({ project, produced })));
    }),
  );
};

export const productDetailResolver: ResolveFn<ProductDetail> = (route) => {
  const repo = inject(ContentRepository);
  const router = inject(Router);
  return repo.productBySlug(route.paramMap.get('slug') ?? '').pipe(
    take(1),
    switchMap((product): Observable<ProductDetail | RedirectCommand> => {
      if (!product) return of(notFound(router));
      if (!product.producedBy) return of({ product, lab: undefined });
      return repo.projectBySlug(product.producedBy).pipe(take(1), map((lab) => ({ product, lab })));
    }),
  );
};
