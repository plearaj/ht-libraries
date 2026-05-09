import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { HtAuthService } from './ht-auth.service';

/**
 * Route data interface for auth redirect configuration
 */
export interface AuthRedirectGuardData {
  redirectTo?: string;
}

/**
 * Guard that protects routes requiring authentication.
 * Redirects unauthenticated users to a configurable login route.
 *
 * Usage:
 * ```typescript
 * {
 *   path: 'dashboard',
 *   component: DashboardComponent,
 *   canActivate: [htAuthRedirectGuard],
 *   data: { redirectTo: '/login' }  // Optional, defaults to '/'
 * }
 * ```
 */
export const htAuthRedirectGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(HtAuthService);
  const router = inject(Router);

  const data = route.data as AuthRedirectGuardData;
  const redirectTo = data.redirectTo || '/';

  if (authService.currentUser()) {
    return true;
  }

  router.navigate([redirectTo]);
  return false;
};
