import { Observable } from 'rxjs';
import { Product, ProductKind, Project, ProjectKind, Service, SiteConfig } from './models';

export interface ProjectFilter {
  kind?: ProjectKind;
  featured?: boolean;
}

export interface ProductFilter {
  kind?: ProductKind;
}

/** Async from day one so the content source can change without touching components. */
export abstract class ContentRepository {
  abstract site(): Observable<SiteConfig>;
  abstract projects(filter?: ProjectFilter): Observable<Project[]>;
  abstract projectBySlug(slug: string): Observable<Project | undefined>;
  abstract services(): Observable<Service[]>;
  abstract products(filter?: ProductFilter): Observable<Product[]>;
  abstract productBySlug(slug: string): Observable<Product | undefined>;
  abstract producedBy(labSlug: string): Observable<Product[]>;
}
