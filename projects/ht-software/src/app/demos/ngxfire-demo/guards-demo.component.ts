import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-guards-demo-protected',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="demo-section">
      <h2>Protected Route</h2>
      <p class="success-banner">You are authenticated and authorized to view this page.</p>
      <p>This route is protected by <code>htAuthRedirectGuard</code>. Unauthenticated users are redirected to <code>/ngxfire-demo</code>.</p>
    </section>
  `,
  styles: [`
    .demo-section { margin: 1.5rem 0; padding: 1.5rem; border: 1px solid #333; border-radius: 8px; background: #1a1a1a; }
    .success-banner { background: #1b3a1b; border: 1px solid #2e7d32; padding: 0.75rem; border-radius: 6px; color: #a5d6a7; font-weight: 600; }
    code { background: #2a2a2a; padding: 0.1rem 0.3rem; border-radius: 3px; font-size: 0.9em; color: #4caf50; }
  `],
})
export class GuardsProtectedComponent {}

@Component({
  selector: 'app-guards-demo-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="demo-section">
      <h2>Admin-Only Route</h2>
      <p class="success-banner">You have the <strong>admin</strong> role. Welcome!</p>
      <p>This route is protected by <code>htRoleGuard</code> with <code>roles: ['admin']</code>.</p>
    </section>
  `,
  styles: [`
    .demo-section { margin: 1.5rem 0; padding: 1.5rem; border: 1px solid #333; border-radius: 8px; background: #1a1a1a; }
    h2 { color: #d4af37; }
    .success-banner { background: #2a1e3a; border: 1px solid #6a1b9a; padding: 0.75rem; border-radius: 6px; color: #ce93d8; font-weight: 600; }
    code { background: #2a2a2a; padding: 0.1rem 0.3rem; border-radius: 3px; font-size: 0.9em; color: #4caf50; }
  `],
})
export class GuardsAdminComponent {}
