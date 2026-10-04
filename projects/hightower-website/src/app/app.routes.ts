import { Routes } from '@angular/router';
import { Shell } from './layout/shell/shell';
import { siteResolver } from './routing/content-resolvers';

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
      },
    ],
  },
];
