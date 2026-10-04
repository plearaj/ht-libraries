import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { PRODUCTS, PROJECTS, SERVICES, SITE } from './content.generated';
import { ContentRepository, ProductFilter, ProjectFilter } from './content-repository';
import { Product, Project, Service, SiteConfig } from './models';

export interface ContentData {
  site: SiteConfig;
  projects: Project[];
  products: Product[];
  services: Service[];
}

export const CONTENT_DATA = new InjectionToken<ContentData>('CONTENT_DATA', {
  providedIn: 'root',
  factory: () => ({ site: SITE, projects: PROJECTS, products: PRODUCTS, services: SERVICES }),
});

@Injectable()
export class StaticContentRepository extends ContentRepository {
  private readonly data = inject(CONTENT_DATA);

  override site(): Observable<SiteConfig> {
    return of(this.data.site);
  }

  override projects(filter: ProjectFilter = {}): Observable<Project[]> {
    return of(
      this.data.projects.filter(
        (p) =>
          (filter.kind === undefined || p.kind === filter.kind) &&
          (filter.featured === undefined || p.featured === filter.featured),
      ),
    );
  }

  override projectBySlug(slug: string): Observable<Project | undefined> {
    return of(this.data.projects.find((p) => p.slug === slug));
  }

  override services(): Observable<Service[]> {
    return of([...this.data.services].sort((a, b) => a.order - b.order));
  }

  override products(filter: ProductFilter = {}): Observable<Product[]> {
    return of(this.data.products.filter((p) => filter.kind === undefined || p.kind === filter.kind));
  }

  override productBySlug(slug: string): Observable<Product | undefined> {
    return of(this.data.products.find((p) => p.slug === slug));
  }

  override producedBy(labSlug: string): Observable<Product[]> {
    return of(this.data.products.filter((p) => p.producedBy === labSlug));
  }
}
