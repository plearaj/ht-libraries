import { Routes } from '@angular/router';
import { Shell } from './layout/shell/shell';
import {
  homeResolver,
  productsResolver,
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
        path: 'about',
        loadComponent: () => import('./pages/about/about-page').then((m) => m.AboutPage),
      },
    ],
  },
];
