import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  HtAuthService, HtAuthAdminService, HtAuthUserSyncService,
  HtLoginComponent, AuthResult, AuthOptions
} from 'ht-quick-ngxfire';
import { CodeSnippetComponent } from '../../shared/code-snippet.component';
import { FirestoreDemoComponent } from './firestore-demo.component';
import { StorageDemoComponent } from './storage-demo.component';

type DemoTab = 'auth' | 'firestore' | 'storage' | 'guards' | 'sync';

@Component({
  selector: 'app-ngxfire-demo',
  imports: [
    FormsModule, RouterLink,
    HtLoginComponent, CodeSnippetComponent,
    FirestoreDemoComponent, StorageDemoComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="demo-container">
      <h1>ht-quick-ngxfire Kitchen Sink</h1>
      <p class="demo-description">
        Comprehensive demo exercising every feature of the library: Auth, Firestore CRUD, Storage,
        Route Guards, Admin services, and User Sync.
      </p>

      <!-- Tab Navigation -->
      <nav class="tab-nav" role="tablist">
        @for (tab of tabs; track tab.id) {
          <button
            class="tab-btn"
            [class.active]="activeTab() === tab.id"
            (click)="activeTab.set(tab.id)"
            role="tab"
            [attr.aria-selected]="activeTab() === tab.id">
            {{ tab.label }}
          </button>
        }
      </nav>

      <!-- AUTH TAB -->
      @if (activeTab() === 'auth') {
        <!-- Current User Info -->
        <section class="demo-section">
          <h2>Current User</h2>
          @if (authService.currentUser()) {
            <div class="user-card">
              <p><strong>Email:</strong> {{ authService.currentUser()?.email }}</p>
              <p><strong>UID:</strong> <code>{{ authService.currentUser()?.uid }}</code></p>
              <p><strong>Display Name:</strong> {{ authService.currentUser()?.displayName || 'Not set' }}</p>
              <p><strong>Email Verified:</strong> {{ authService.currentUser()?.emailVerified }}</p>
              <button class="btn btn-danger" (click)="signOut()">Sign Out</button>
            </div>
          } @else {
            <p>Not signed in</p>
          }
        </section>

        <!-- Login Component -->
        @if (!authService.currentUser()) {
          <section class="demo-section">
            <h2>Sign In</h2>
            <ht-login [authOptions]="loginOptions" (authResult)="onAuthResult($event)" />
          </section>
        }

        <!-- Admin Features -->
        @if (authService.currentUser()) {
          <section class="demo-section">
            <h2>Admin Features</h2>

            <div class="feature-group">
              <h3>Current User Role</h3>
              @if (userRole()) {
                <p><strong>Role:</strong> {{ userRole()?.['role'] }}</p>
                <p><strong>Permissions:</strong> {{ asStringArray(userRole()?.['permissions'])?.join(', ') || 'None' }}</p>
              } @else {
                <p>No role assigned</p>
                <button class="btn btn-primary" (click)="assignCurrentUserRole()">Assign User Role</button>
              }
            </div>

            <div class="feature-group">
              <h3>Assign Role to User</h3>
              <input [(ngModel)]="targetUserId" placeholder="User ID" class="input" />
              <select [(ngModel)]="selectedRole" class="input">
                <option value="admin">Admin</option>
                <option value="user">User</option>
                <option value="moderator">Moderator</option>
                <option value="editor">Editor</option>
              </select>
              <button class="btn btn-accent" (click)="assignRole()">Assign Role</button>
            </div>

            <div class="feature-group">
              <h3>Send Password Reset Email</h3>
              <input [(ngModel)]="resetEmail" placeholder="Email address" type="email" class="input" />
              <button class="btn btn-warn" (click)="sendPasswordReset()">Send Reset Email</button>
            </div>

            <div class="feature-group">
              <h3>Check User Permission</h3>
              <input [(ngModel)]="checkUserId" placeholder="User ID" class="input" />
              <input [(ngModel)]="checkPermission" placeholder="Permission (e.g., edit:posts)" class="input" />
              <button class="btn btn-info" (click)="checkUserPermission()">Check Permission</button>
              @if (permissionResult() !== null) {
                <p><strong>Result:</strong> {{ permissionResult() ? 'Has Permission' : 'No Permission' }}</p>
              }
            </div>

            <div class="feature-group">
              <h3>Update Profile</h3>
              <input [(ngModel)]="newDisplayName" placeholder="Display Name" class="input" />
              <button class="btn btn-primary" (click)="updateProfile()">Update Profile</button>
            </div>

            <div class="feature-group">
              <h3>Check Admin Status</h3>
              <button class="btn btn-info" (click)="checkAdmin()">Am I Admin?</button>
              @if (isAdmin() !== null) {
                <span class="result-badge" [class.yes]="isAdmin()" [class.no]="!isAdmin()">
                  {{ isAdmin() ? 'Yes' : 'No' }}
                </span>
              }
            </div>
          </section>
        }
      }

      <!-- FIRESTORE TAB -->
      @if (activeTab() === 'firestore') {
        @if (authService.currentUser()) {
          <app-firestore-demo />
        } @else {
          <section class="demo-section">
            <p class="muted">Sign in on the Auth tab first to use Firestore features.</p>
          </section>
        }
      }

      <!-- STORAGE TAB -->
      @if (activeTab() === 'storage') {
        @if (authService.currentUser()) {
          <app-storage-demo />
        } @else {
          <section class="demo-section">
            <p class="muted">Sign in on the Auth tab first to use Storage features.</p>
          </section>
        }
      }

      <!-- GUARDS TAB -->
      @if (activeTab() === 'guards') {
        <section class="demo-section">
          <h2>Route Guards</h2>
          <p>These routes demonstrate <code>htAuthRedirectGuard</code> and <code>htRoleGuard</code>.</p>

          <div class="feature-group">
            <h3>Auth-Protected Route</h3>
            <p class="hint">Requires authentication. Redirects to <code>/ngxfire-demo</code> if not signed in.</p>
            <a routerLink="/ngxfire-demo/protected" class="btn btn-primary">Visit Protected Route</a>
          </div>

          <div class="feature-group">
            <h3>Admin-Only Route</h3>
            <p class="hint">Requires the <strong>admin</strong> role. Redirects to <code>/ngxfire-demo</code> if unauthorized.</p>
            <a routerLink="/ngxfire-demo/admin" class="btn btn-accent">Visit Admin Route</a>
          </div>

          <div class="guard-code">
            <h3>Route Configuration</h3>
            <app-code-snippet [code]="guardCode" language="typescript" />
          </div>
        </section>
      }

      <!-- USER SYNC TAB -->
      @if (activeTab() === 'sync') {
        <section class="demo-section">
          <h2>User Sync</h2>
          <p>The <code>HtAuthUserSyncService</code> automatically syncs authenticated users to Firestore
            on sign-in via <code>APP_INITIALIZER</code>. You can also trigger a manual sync.</p>

          @if (authService.currentUser()) {
            <div class="feature-group">
              <button class="btn btn-primary" (click)="manualSync()">Manual Sync Current User</button>
              <p class="hint">Manually calls <code>syncCurrentUser()</code> to update the <code>users/&#123;uid&#125;</code> document.</p>
            </div>
          } @else {
            <p class="muted">Sign in on the Auth tab to test user sync.</p>
          }
        </section>
      }

      <!-- Global Messages -->
      @if (message()) {
        <div class="message" [class.error]="messageType() === 'error'" [class.success]="messageType() === 'success'">
          {{ message() }}
        </div>
      }
    </div>
  `,
  styles: [`
    .demo-container { padding: 2rem; max-width: 1200px; margin: 0 auto; }
    .demo-description { color: #aaa; margin-bottom: 1.5rem; }
    .tab-nav { display: flex; gap: 0; border-bottom: 2px solid #333; margin-bottom: 1.5rem; }
    .tab-btn {
      padding: 0.75rem 1.25rem; border: none; background: transparent; cursor: pointer;
      font-size: 0.95rem; font-weight: 500; color: #888; border-bottom: 2px solid transparent;
      margin-bottom: -2px; transition: all 0.15s;
    }
    .tab-btn.active { color: #4caf50; border-bottom-color: #4caf50; }
    .tab-btn:hover:not(.active) { color: #d4af37; background: #1e1e1e; }
    .demo-section { margin: 1.5rem 0; padding: 1.5rem; border: 1px solid #333; border-radius: 8px; background: #1a1a1a; }
    h2 { margin-top: 0; color: #d4af37; }
    .user-card { background: #1e2a1e; border: 1px solid #2e7d32; padding: 1rem; border-radius: 6px; }
    .feature-group { margin-bottom: 1.5rem; }
    .hint { color: #888; font-size: 0.85rem; margin: 0.25rem 0 0.5rem; }
    .input { padding: 0.5rem; margin-right: 0.5rem; border: 1px solid #444; border-radius: 4px; background: #222; color: #e0e0e0; }
    .btn { padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer; color: white; margin-right: 0.5rem; text-decoration: none; display: inline-block; }
    .btn-primary { background: #2e7d32; }
    .btn-danger { background: #c62828; }
    .btn-accent { background: #6a1b9a; }
    .btn-warn { background: #b8860b; }
    .btn-info { background: #00838f; }
    .result-badge { margin-left: 0.5rem; padding: 0.25rem 0.75rem; border-radius: 12px; font-weight: 600; }
    .result-badge.yes { background: #1b5e20; color: #a5d6a7; }
    .result-badge.no { background: #4a1010; color: #ef9a9a; }
    .muted { color: #777; font-style: italic; }
    .message { padding: 1rem; border-radius: 8px; margin: 1rem 0; }
    .message.success { background: #1b3a1b; border: 2px solid #2e7d32; color: #a5d6a7; }
    .message.error { background: #3a1b1b; border: 2px solid #c62828; color: #ef9a9a; }
    code { background: #2a2a2a; padding: 0.1rem 0.3rem; border-radius: 3px; font-size: 0.9em; color: #4caf50; }
    .guard-code { margin-top: 1rem; }
  `],
})
export class NgxfireDemoComponent {
  readonly authService = inject(HtAuthService);
  private adminService = inject(HtAuthAdminService);
  private userSyncService = inject(HtAuthUserSyncService);

  readonly tabs: { id: DemoTab; label: string }[] = [
    { id: 'auth', label: 'Auth & Admin' },
    { id: 'firestore', label: 'Firestore' },
    { id: 'storage', label: 'Storage' },
    { id: 'guards', label: 'Guards' },
    { id: 'sync', label: 'User Sync' },
  ];

  activeTab = signal<DemoTab>('auth');
  userRole = signal<Record<string, unknown> | null>(null);
  isAdmin = signal<boolean | null>(null);

  targetUserId = '';
  selectedRole = 'user';
  resetEmail = '';
  checkUserId = '';
  checkPermission = '';
  permissionResult = signal<boolean | null>(null);
  newDisplayName = '';
  message = signal('');
  messageType = signal<'success' | 'error'>('success');

  loginOptions: AuthOptions = {
    email: true,
    google: true,
    facebook: true,
    twitter: true,
    github: true,
    microsoft: true,
    apple: true,
  };

  constructor() {
    this.authService.user$.subscribe(user => {
      if (user) {
        this.loadUserRole(user.uid);
      } else {
        this.userRole.set(null);
        this.isAdmin.set(null);
      }
    });
  }

  asStringArray(value: unknown): string[] | null {
    return Array.isArray(value) ? value as string[] : null;
  }

  onAuthResult(result: AuthResult): void {
    if (result.success) {
      this.showMessage('Signed in successfully!', 'success');
    } else if (result.error) {
      this.showMessage(`Error: ${result.error.message}`, 'error');
    }
  }

  async loadUserRole(userId: string): Promise<void> {
    try {
      const role = await this.adminService.getUserRoleAsync(userId);
      this.userRole.set(role as Record<string, unknown> | null);
    } catch {
      // Role not assigned yet
    }
  }

  async assignCurrentUserRole(): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) return;
    try {
      await this.adminService.assignUserRole(user.uid, 'user', ['read:posts', 'create:posts']);
      await this.loadUserRole(user.uid);
      this.showMessage('Role assigned successfully!', 'success');
    } catch (e: unknown) {
      this.showMessage((e as Error).message, 'error');
    }
  }

  async assignRole(): Promise<void> {
    if (!this.targetUserId || !this.selectedRole) {
      this.showMessage('Please enter user ID and select a role', 'error');
      return;
    }
    try {
      const permissions = this.getPermissionsForRole(this.selectedRole);
      await this.adminService.assignUserRole(this.targetUserId, this.selectedRole, permissions);
      this.showMessage(`Role "${this.selectedRole}" assigned successfully!`, 'success');
      this.targetUserId = '';
    } catch (e: unknown) {
      this.showMessage((e as Error).message, 'error');
    }
  }

  async sendPasswordReset(): Promise<void> {
    if (!this.resetEmail) { this.showMessage('Please enter an email address', 'error'); return; }
    try {
      await this.adminService.sendPasswordResetEmail(this.resetEmail);
      this.showMessage('Password reset email sent!', 'success');
      this.resetEmail = '';
    } catch (e: unknown) {
      this.showMessage((e as Error).message, 'error');
    }
  }

  async checkUserPermission(): Promise<void> {
    if (!this.checkUserId || !this.checkPermission) {
      this.showMessage('Please enter user ID and permission', 'error');
      return;
    }
    try {
      const hasPermission = await this.adminService.hasPermission(this.checkUserId, this.checkPermission);
      this.permissionResult.set(hasPermission);
    } catch (e: unknown) {
      this.showMessage((e as Error).message, 'error');
    }
  }

  async updateProfile(): Promise<void> {
    if (!this.newDisplayName) { this.showMessage('Please enter a display name', 'error'); return; }
    try {
      await this.adminService.updateUserProfile({ displayName: this.newDisplayName });
      this.showMessage('Profile updated successfully!', 'success');
      this.newDisplayName = '';
    } catch (e: unknown) {
      this.showMessage((e as Error).message, 'error');
    }
  }

  async checkAdmin(): Promise<void> {
    try {
      const result = await this.adminService.isCurrentUserAdmin();
      this.isAdmin.set(result);
    } catch (e: unknown) {
      this.showMessage((e as Error).message, 'error');
    }
  }

  async signOut(): Promise<void> {
    try {
      await this.authService.signOut();
      this.showMessage('Signed out successfully', 'success');
    } catch (e: unknown) {
      this.showMessage((e as Error).message, 'error');
    }
  }

  async manualSync(): Promise<void> {
    try {
      await this.userSyncService.syncCurrentUser();
      this.showMessage('User synced to Firestore!', 'success');
    } catch (e: unknown) {
      this.showMessage((e as Error).message, 'error');
    }
  }

  private getPermissionsForRole(role: string): string[] {
    const permissionMap: Record<string, string[]> = {
      admin: ['*'],
      moderator: ['read:posts', 'edit:posts', 'delete:comments', 'ban:users'],
      editor: ['read:posts', 'edit:posts', 'create:posts'],
      user: ['read:posts', 'create:posts', 'edit:own:posts'],
    };
    return permissionMap[role] || [];
  }

  private showMessage(msg: string, type: 'success' | 'error'): void {
    this.message.set(msg);
    this.messageType.set(type);
    setTimeout(() => this.message.set(''), 5000);
  }

  readonly guardCode = `// app.routes.ts
import { htAuthRedirectGuard, htRoleGuard } from 'ht-quick-ngxfire';

{
  path: 'ngxfire-demo/protected',
  loadComponent: () => import('./guards-demo.component')
    .then(m => m.GuardsProtectedComponent),
  canActivate: [htAuthRedirectGuard],
  data: { redirectTo: '/ngxfire-demo' }
},
{
  path: 'ngxfire-demo/admin',
  loadComponent: () => import('./guards-demo.component')
    .then(m => m.GuardsAdminComponent),
  canActivate: [htRoleGuard],
  data: { roles: ['admin'], redirectTo: '/ngxfire-demo' }
}`;
}
