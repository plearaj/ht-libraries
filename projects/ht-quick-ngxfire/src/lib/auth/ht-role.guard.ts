import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { HtAuthAdminService } from './ht-auth-admin.service';
import { Auth } from '@angular/fire/auth';

/**
 * Route data interface for role-based access control
 */
export interface RoleGuardData {
  roles: string[];
  redirectTo?: string;
}

/**
 * Functional route guard that checks if the current user has one of the required roles
 *
 * Usage in routes:
 * ```typescript
 * {
 *   path: 'admin',
 *   component: AdminComponent,
 *   canActivate: [htRoleGuard],
 *   data: { roles: ['admin'] }
 * }
 *
 * // Or with redirect
 * {
 *   path: 'moderator',
 *   component: ModeratorComponent,
 *   canActivate: [htRoleGuard],
 *   data: { roles: ['admin', 'moderator'], redirectTo: '/unauthorized' }
 * }
 * ```
 */
export const htRoleGuard: CanActivateFn = async (route: ActivatedRouteSnapshot) => {
  const auth = inject(Auth);
  const adminService = inject(HtAuthAdminService);
  const router = inject(Router);

  const data = route.data as RoleGuardData;
  const requiredRoles = data.roles || [];
  const redirectTo = data.redirectTo || '/';

  // If no roles specified, deny access
  if (requiredRoles.length === 0) {
    router.navigate([redirectTo]);
    return false;
  }

  // Check if user is authenticated
  const user = auth.currentUser;
  if (!user) {
    router.navigate([redirectTo]);
    return false;
  }

  // Check user's role
  const userRole = await adminService.getUserRoleAsync(user.uid);

  if (!userRole) {
    router.navigate([redirectTo]);
    return false;
  }

  const hasRequiredRole = requiredRoles.includes(userRole.role);
  if (!hasRequiredRole) {
    router.navigate([redirectTo]);
  }
  return hasRequiredRole;
};

/**
 * Factory function to create a role guard with specific roles
 * Useful for creating reusable guards
 *
 * Usage:
 * ```typescript
 * export const adminGuard = createRoleGuard(['admin']);
 * export const moderatorGuard = createRoleGuard(['admin', 'moderator']);
 *
 * // In routes
 * {
 *   path: 'admin',
 *   component: AdminComponent,
 *   canActivate: [adminGuard]
 * }
 * ```
 */
export function createRoleGuard(roles: string[], redirectTo: string = '/'): CanActivateFn {
  return async (route: ActivatedRouteSnapshot) => {
    const auth = inject(Auth);
    const adminService = inject(HtAuthAdminService);
    const router = inject(Router);

    const user = auth.currentUser;
    if (!user) {
      router.navigate([redirectTo]);
      return false;
    }

    const userRole = await adminService.getUserRoleAsync(user.uid);
    if (!userRole) {
      router.navigate([redirectTo]);
      return false;
    }

    const hasRequiredRole = roles.includes(userRole.role);
    if (!hasRequiredRole) {
      router.navigate([redirectTo]);
    }
    return hasRequiredRole;
  };
}

/**
 * Pre-configured admin-only guard
 */
export const htAdminGuard = createRoleGuard(['admin']);
