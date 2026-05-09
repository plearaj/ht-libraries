import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HtAuthUIService, HtAuthAdminService, HtAuthUIComponent } from 'ht-quick-ngxfire';

@Component({
  selector: 'app-auth-test',
  imports: [CommonModule, FormsModule, HtAuthUIComponent],
  template: `
    <div style="padding: 2rem; max-width: 1200px; margin: 0 auto;">
      <h1>🔐 Auth Service Test</h1>

      <!-- Current User Info -->
      <div style="background: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 8px; padding: 1.5rem; margin: 1rem 0;">
        <h2>Current User</h2>
        @if (currentUser()) {
          <p><strong>Email:</strong> {{ currentUser()?.email }}</p>
          <p><strong>UID:</strong> {{ currentUser()?.uid }}</p>
          <p><strong>Display Name:</strong> {{ currentUser()?.displayName || 'Not set' }}</p>
          <button (click)="signOut()" style="padding: 0.5rem 1rem; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Sign Out
          </button>
        } @else {
          <p>Not signed in</p>
        }
      </div>

      <!-- FirebaseUI Sign In -->
      @if (!currentUser()) {
        <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 1.5rem; margin: 1rem 0;">
          <h2>Sign In</h2>
          <ht-auth-ui [config]="authUIConfig"></ht-auth-ui>
        </div>
      }

      <!-- Admin Features (only shown when signed in) -->
      @if (currentUser()) {
        <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 8px; padding: 1.5rem; margin: 1rem 0;">
          <h2>🛡️ Admin Features</h2>

          <!-- User Role -->
          <div style="margin-bottom: 1.5rem;">
            <h3>Current User Role</h3>
            @if (userRole()) {
              <p><strong>Role:</strong> {{ userRole()?.role }}</p>
              <p><strong>Permissions:</strong> {{ userRole()?.permissions?.join(', ') || 'None' }}</p>
            } @else {
              <p>No role assigned</p>
              <button (click)="assignCurrentUserRole()" style="padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Assign User Role
              </button>
            }
          </div>

          <!-- Assign Role to User -->
          <div style="margin-bottom: 1.5rem;">
            <h3>Assign Role to User</h3>
            <input
              [(ngModel)]="targetUserId"
              placeholder="User ID"
              style="padding: 0.5rem; margin-right: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
            <select
              [(ngModel)]="selectedRole"
              style="padding: 0.5rem; margin-right: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
              <option value="admin">Admin</option>
              <option value="user">User</option>
              <option value="moderator">Moderator</option>
              <option value="editor">Editor</option>
            </select>
            <button (click)="assignRole()" style="padding: 0.5rem 1rem; background: #8b5cf6; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Assign Role
            </button>
          </div>

          <!-- Password Reset -->
          <div style="margin-bottom: 1.5rem;">
            <h3>Send Password Reset Email</h3>
            <input
              [(ngModel)]="resetEmail"
              placeholder="Email address"
              type="email"
              style="padding: 0.5rem; margin-right: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
            <button (click)="sendPasswordReset()" style="padding: 0.5rem 1rem; background: #f59e0b; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Send Reset Email
            </button>
          </div>

          <!-- Check Permission -->
          <div style="margin-bottom: 1.5rem;">
            <h3>Check User Permission</h3>
            <input
              [(ngModel)]="checkUserId"
              placeholder="User ID"
              style="padding: 0.5rem; margin-right: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
            <input
              [(ngModel)]="checkPermission"
              placeholder="Permission (e.g., edit:posts)"
              style="padding: 0.5rem; margin-right: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
            <button (click)="checkUserPermission()" style="padding: 0.5rem 1rem; background: #06b6d4; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Check Permission
            </button>
            @if (permissionResult() !== null) {
              <p style="margin-top: 0.5rem;">
                <strong>Result:</strong> {{ permissionResult() ? '✅ Has Permission' : '❌ No Permission' }}
              </p>
            }
          </div>

          <!-- Update Profile -->
          <div style="margin-bottom: 1.5rem;">
            <h3>Update Profile</h3>
            <input
              [(ngModel)]="newDisplayName"
              placeholder="Display Name"
              style="padding: 0.5rem; margin-right: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
            <button (click)="updateProfile()" style="padding: 0.5rem 1rem; background: #14b8a6; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Update Profile
            </button>
          </div>
        </div>

        <!-- Messages -->
        @if (message()) {
          <div style="background: {{ messageType() === 'error' ? '#fee2e2' : '#d1fae5' }}; border: 2px solid {{ messageType() === 'error' ? '#ef4444' : '#10b981' }}; border-radius: 8px; padding: 1rem; margin: 1rem 0;">
            <p style="margin: 0;">{{ message() }}</p>
          </div>
        }
      }
    </div>
  `
})
export class AuthTestComponent {
  private authUIService = inject(HtAuthUIService);
  private adminService = inject(HtAuthAdminService);

  currentUser = signal(this.authUIService.currentUser);
  userRole = signal<any>(null);

  targetUserId = '';
  selectedRole = 'user';
  resetEmail = '';
  checkUserId = '';
  checkPermission = '';
  permissionResult = signal<boolean | null>(null);
  newDisplayName = '';
  message = signal('');
  messageType = signal<'success' | 'error'>('success');

  authUIConfig = {
    signInOptions: ['password', 'google.com'],
    tosUrl: '/terms',
    privacyPolicyUrl: '/privacy'
  };

  constructor() {
    // Subscribe to auth state changes
    this.authUIService.user$.subscribe(user => {
      this.currentUser.set(user);
      if (user) {
        this.loadUserRole(user.uid);
      } else {
        this.userRole.set(null);
      }
    });
  }

  async loadUserRole(userId: string) {
    try {
      const role = await this.adminService.getUserRoleAsync(userId);
      this.userRole.set(role);
    } catch (error) {
      console.error('Error loading user role:', error);
    }
  }

  async assignCurrentUserRole() {
    const user = this.currentUser();
    if (!user) return;

    try {
      await this.adminService.assignUserRole(user.uid, 'user', ['read:posts', 'create:posts']);
      await this.loadUserRole(user.uid);
      this.showMessage('Role assigned successfully!', 'success');
    } catch (error: any) {
      this.showMessage(`Error: ${error.message}`, 'error');
    }
  }

  async assignRole() {
    if (!this.targetUserId || !this.selectedRole) {
      this.showMessage('Please enter user ID and select a role', 'error');
      return;
    }

    try {
      const permissions = this.getPermissionsForRole(this.selectedRole);
      await this.adminService.assignUserRole(this.targetUserId, this.selectedRole, permissions);
      this.showMessage(`Role "${this.selectedRole}" assigned successfully!`, 'success');
      this.targetUserId = '';
    } catch (error: any) {
      this.showMessage(`Error: ${error.message}`, 'error');
    }
  }

  async sendPasswordReset() {
    if (!this.resetEmail) {
      this.showMessage('Please enter an email address', 'error');
      return;
    }

    try {
      await this.adminService.sendPasswordResetEmail(this.resetEmail);
      this.showMessage('Password reset email sent!', 'success');
      this.resetEmail = '';
    } catch (error: any) {
      this.showMessage(`Error: ${error.message}`, 'error');
    }
  }

  async checkUserPermission() {
    if (!this.checkUserId || !this.checkPermission) {
      this.showMessage('Please enter user ID and permission', 'error');
      return;
    }

    try {
      const hasPermission = await this.adminService.hasPermission(this.checkUserId, this.checkPermission);
      this.permissionResult.set(hasPermission);
    } catch (error: any) {
      this.showMessage(`Error: ${error.message}`, 'error');
    }
  }

  async updateProfile() {
    if (!this.newDisplayName) {
      this.showMessage('Please enter a display name', 'error');
      return;
    }

    try {
      await this.adminService.updateUserProfile({ displayName: this.newDisplayName });
      this.showMessage('Profile updated successfully!', 'success');
      this.newDisplayName = '';
      // Refresh current user
      this.currentUser.set(this.authUIService.currentUser);
    } catch (error: any) {
      this.showMessage(`Error: ${error.message}`, 'error');
    }
  }

  async signOut() {
    try {
      await this.authUIService.signOut();
      this.showMessage('Signed out successfully', 'success');
    } catch (error: any) {
      this.showMessage(`Error: ${error.message}`, 'error');
    }
  }

  private getPermissionsForRole(role: string): string[] {
    const permissionMap: Record<string, string[]> = {
      'admin': ['*'],
      'moderator': ['read:posts', 'edit:posts', 'delete:comments', 'ban:users'],
      'editor': ['read:posts', 'edit:posts', 'create:posts'],
      'user': ['read:posts', 'create:posts', 'edit:own:posts']
    };
    return permissionMap[role] || [];
  }

  private showMessage(msg: string, type: 'success' | 'error') {
    this.message.set(msg);
    this.messageType.set(type);
    setTimeout(() => this.message.set(''), 5000);
  }
}
