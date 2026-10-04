import { ProductKind, Project, ProjectKind, Status } from './models';

export const STATUS_LABEL: Record<Status, string> = {
  live: 'Live',
  'in-progress': 'In progress',
  concept: 'Concept',
};

export const PROJECT_KIND_LABEL: Record<ProjectKind, string> = {
  lab: 'Lab',
  product: 'Product',
  client: 'Client',
};

export const PRODUCT_KIND_LABEL: Record<ProductKind, string> = {
  app: 'App',
  library: 'Library',
};

/** Product-kind projects have one canonical page under /products. */
export function projectLink(project: Project): string {
  return project.kind === 'product' && project.productSlug
    ? `/products/${project.productSlug}`
    : `/portfolio/${project.slug}`;
}
