import { Routes } from '@angular/router';
import { Shell } from './layout/shell/shell';
import {
  homeResolver,
  productDetailResolver,
  productsResolver,
  projectDetailResolver,
  projectsResolver,
  servicesResolver,
  siteResolver,
} from './routing/content-resolvers';

export const routes: Routes = [
  {
    path: '',
    component: Shell,
    resolve: { site: siteResolver },
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./pages/home/home-page').then((m) => m.HomePage),
        resolve: { home: homeResolver },
      },
      {
        path: 'services',
        loadComponent: () => import('./pages/services/services-page').then((m) => m.ServicesPage),
        resolve: { services: servicesResolver },
      },
      {
        path: 'portfolio',
        loadComponent: () => import('./pages/portfolio/portfolio-page').then((m) => m.PortfolioPage),
        resolve: { projects: projectsResolver },
      },
      {
        path: 'products',
        loadComponent: () => import('./pages/products/products-page').then((m) => m.ProductsPage),
        resolve: { products: productsResolver },
      },
      {
        path: 'portfolio/:slug',
        loadComponent: () =>
          import('./pages/project-detail/project-detail-page').then((m) => m.ProjectDetailPage),
        resolve: { detail: projectDetailResolver },
      },
      {
        path: 'products/:slug',
        loadComponent: () =>
          import('./pages/product-detail/product-detail-page').then((m) => m.ProductDetailPage),
        resolve: { detail: productDetailResolver },
      },
      {
        path: 'about',
        loadComponent: () => import('./pages/about/about-page').then((m) => m.AboutPage),
      },
      {
        path: 'contact',
        loadComponent: () => import('./pages/contact/contact-page').then((m) => m.ContactPage),
        resolve: { services: servicesResolver },
      },
      {
        path: 'not-found',
        loadComponent: () => import('./pages/not-found/not-found-page').then((m) => m.NotFoundPage),
      },
      {
        path: '**',
        loadComponent: () => import('./pages/not-found/not-found-page').then((m) => m.NotFoundPage),
      },
    ],
  },
];
