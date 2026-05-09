import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { htAuthRedirectGuard, htRoleGuard } from 'ht-quick-ngxfire';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'table-demo', loadComponent: () => import('./demos/table-demo/table-demo.component').then(m => m.TableDemoComponent) },
  { path: 'table-demo/simple', loadComponent: () => import('./demos/table-demo/simple/simple-table-demo.component').then(m => m.SimpleTableDemoComponent) },
  { path: 'table-demo/kitchen-sink', loadComponent: () => import('./demos/table-demo/kitchen-sink/kitchen-sink-demo.component').then(m => m.KitchenSinkDemoComponent) },
  { path: 'ngxfire-demo', loadComponent: () => import('./demos/ngxfire-demo/ngxfire-demo.component').then(m => m.NgxfireDemoComponent) },
  {
    path: 'ngxfire-demo/protected',
    loadComponent: () => import('./demos/ngxfire-demo/guards-demo.component').then(m => m.GuardsProtectedComponent),
    canActivate: [htAuthRedirectGuard],
    data: { redirectTo: '/ngxfire-demo' },
  },
  {
    path: 'ngxfire-demo/admin',
    loadComponent: () => import('./demos/ngxfire-demo/guards-demo.component').then(m => m.GuardsAdminComponent),
    canActivate: [htRoleGuard],
    data: { roles: ['admin'], redirectTo: '/ngxfire-demo' },
  },
  { path: 'camera-demo', loadComponent: () => import('./demos/camera-demo/camera-demo.component').then(m => m.CameraDemoComponent) },
];
