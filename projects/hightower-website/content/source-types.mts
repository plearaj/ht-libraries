import type { Product, Project, Service } from '../src/app/content/models';

/** Authored form of a model: markdown `description` in place of generated `descriptionHtml`. */
export type WithMarkdown<T extends { descriptionHtml: string }> = Omit<T, 'descriptionHtml'> & {
  description: string;
};

export type ProjectSource = WithMarkdown<Project>;
export type ProductSource = WithMarkdown<Product>;
export type ServiceSource = WithMarkdown<Service>;
