import { inject } from '@angular/core';
import { RenderMode, ServerRoute } from '@angular/ssr';
import { firstValueFrom } from 'rxjs';
import { ContentRepository } from './content/content-repository';

/** Every static route is prerendered. Keep in sync with STATIC_ROUTES in scripts/postbuild.mjs. */
const STATIC_PATHS = ['', 'services', 'portfolio', 'products', 'about', 'not-found'];

export const serverRoutes: ServerRoute[] = [
  ...STATIC_PATHS.map((path): ServerRoute => ({ path, renderMode: RenderMode.Prerender })),
  {
    path: 'portfolio/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      const projects = await firstValueFrom(inject(ContentRepository).projects());
      // Product-kind projects have their canonical page under /products.
      return projects.filter((p) => p.kind !== 'product').map((p) => ({ slug: p.slug }));
    },
  },
  {
    path: 'products/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      const products = await firstValueFrom(inject(ContentRepository).products());
      return products.map((p) => ({ slug: p.slug }));
    },
  },
  { path: '**', renderMode: RenderMode.Client },
];
