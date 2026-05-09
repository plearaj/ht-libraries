# Admin Auth Service Usage Guide

The `HtAuthAdminService` provides administrative functionality for user management, including password resets, role assignment, and permission checking.

## Features

- Password management (reset, update)
- User profile management (email, display name, photo)
- Role assignment system with permissions
- Permission checking (reactive and promise-based)
- Batch role operations
- User deletion

## Installation

The service is included in `ht-quick-ngxfire`. Make sure you have Firebase initialized with both Auth and Firestore:

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideHtQuickNgxFire } from 'ht-quick-ngxfire';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHtQuickNgxFire({
      apiKey: 'your-api-key',
      authDomain: 'your-app.firebaseapp.com',
      projectId: 'your-project-id',
      // ... other config
    })
  ]
};
```

## Basic Usage

### Inject the Service

```typescript
import { Component, inject } from '@angular/core';
import { HtAuthAdminService } from 'ht-quick-ngxfire';

@Component({
  selector: 'app-admin-panel',
  templateUrl: './admin-panel.component.html'
})
export class AdminPanelComponent {
  private adminService = inject(HtAuthAdminService);
}
```

## Password Management

### Send Password Reset Email

```typescript
// Basic usage
await this.adminService.sendPasswordResetEmail('user@example.com');

// With action code settings
await this.adminService.sendPasswordResetEmail(
  'user@example.com',
  {
    url: 'https://yourapp.com/reset-complete',
    handleCodeInApp: true
  }
);
```

### Update Current User's Password

```typescript
// Requires recent authentication
try {
  await this.adminService.updateUserPassword('newSecurePassword123');
  console.log('Password updated successfully');
} catch (error) {
  if (error.code === 'auth/requires-recent-login') {
    // Prompt user to re-authenticate
  }
}
```

## Profile Management

### Update User Email

```typescript
try {
  await this.adminService.updateUserEmail('newemail@example.com');
} catch (error) {
  if (error.code === 'auth/requires-recent-login') {
    // Handle re-authentication
  }
}
```

### Update User Profile

```typescript
await this.adminService.updateUserProfile({
  displayName: 'John Doe',
  photoURL: 'https://example.com/photo.jpg'
});
```

## Role Management

### Role Data Structure

Roles are stored in Firestore at `users/{userId}/roles/current`:

```typescript
interface UserRole {
  role: 'admin' | 'user' | 'moderator' | string;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Assign Role to User

```typescript
await this.adminService.assignUserRole(
  'userId123',
  'moderator',
  ['edit:posts', 'delete:comments', 'ban:users']
);
```

### Get User's Role

```typescript
// Observable approach (reactive)
this.adminService.getUserRole('userId123').subscribe(role => {
  console.log('User role:', role?.role);
  console.log('Permissions:', role?.permissions);
});

// Promise approach
const role = await this.adminService.getUserRoleAsync('userId123');
if (role?.role === 'admin') {
  // Grant admin access
}
```

### Check if User Has Role

```typescript
const isAdmin = await this.adminService.hasRole('userId123', 'admin');
if (isAdmin) {
  // User is an admin
}
```

## Permission Checking

### Check Single Permission

```typescript
// Observable approach
this.adminService.hasPermission('userId123', 'delete:posts').subscribe(hasPermission => {
  if (hasPermission) {
    // User can delete posts
  }
});

// Promise approach
const canDelete = await this.adminService.hasPermissionAsync('userId123', 'delete:posts');
```

### Check Multiple Permissions (Any)

```typescript
// Returns true if user has ANY of the permissions
const canModerate = await this.adminService.hasAnyPermissionAsync(
  'userId123',
  ['ban:users', 'delete:comments', 'edit:posts']
);
```

### Check Multiple Permissions (All)

```typescript
// Returns true only if user has ALL permissions
const canFullyManage = await this.adminService.hasAllPermissionsAsync(
  'userId123',
  ['edit:posts', 'delete:posts', 'moderate:posts']
);
```

## Current User Utilities

### Check Current User's Role

```typescript
const role = await this.adminService.getCurrentUserRole();
console.log('Current user role:', role?.role);
```

### Check if Current User is Admin

```typescript
const isAdmin = await this.adminService.isCurrentUserAdmin();
if (isAdmin) {
  // Show admin features
}
```

### Check Current User's Permission

```typescript
const canEditPosts = await this.adminService.currentUserHasPermission('edit:posts');
```

## Batch Operations

### Assign Roles to Multiple Users

```typescript
await this.adminService.batchAssignRoles([
  { 
    userId: 'user1', 
    role: 'moderator', 
    permissions: ['edit:posts', 'delete:comments'] 
  },
  { 
    userId: 'user2', 
    role: 'admin', 
    permissions: ['*'] 
  },
  { 
    userId: 'user3', 
    role: 'user', 
    permissions: ['read:posts', 'create:posts'] 
  }
]);
```

## Advanced: Re-authentication

For sensitive operations like password/email changes:

```typescript
import { EmailAuthProvider, reauthenticateWithCredential } from '@angular/fire/auth';

async updateEmailWithReauth(newEmail: string, currentPassword: string) {
  try {
    const user = this.auth.currentUser;
    if (!user?.email) throw new Error('No user signed in');
    
    // Re-authenticate
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    
    // Now update email
    await this.adminService.updateUserEmail(newEmail);
  } catch (error) {
    console.error('Failed to update email:', error);
  }
}
```

## User Deletion

```typescript
// Requires recent authentication
try {
  await this.adminService.deleteCurrentUser();
} catch (error) {
  if (error.code === 'auth/requires-recent-login') {
    // Prompt for re-authentication
  }
}
```

## Complete Example: Admin Panel Component

```typescript
import { Component, inject, OnInit } from '@angular/core';
import { HtAuthAdminService } from 'ht-quick-ngxfire';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-panel">
      <h2>Admin Panel</h2>
      
      <div *ngIf="isAdmin$ | async">
        <section>
          <h3>Password Reset</h3>
          <input [(ngModel)]="resetEmail" placeholder="User email">
          <button (click)="sendPasswordReset()">Send Reset Email</button>
        </section>

        <section>
          <h3>Assign Role</h3>
          <input [(ngModel)]="targetUserId" placeholder="User ID">
          <select [(ngModel)]="selectedRole">
            <option value="user">User</option>
            <option value="moderator">Moderator</option>
            <option value="admin">Admin</option>
          </select>
          <button (click)="assignRole()">Assign Role</button>
        </section>

        <section>
          <h3>Check Permissions</h3>
          <input [(ngModel)]="checkUserId" placeholder="User ID">
          <input [(ngModel)]="checkPermission" placeholder="Permission">
          <button (click)="checkUserPermission()">Check</button>
          <p *ngIf="permissionResult !== null">
            Has permission: {{ permissionResult }}
          </p>
        </section>
      </div>

      <div *ngIf="!(isAdmin$ | async)">
        <p>You must be an admin to access this panel.</p>
      </div>
    </div>
  `
})
export class AdminPanelComponent implements OnInit {
  private adminService = inject(HtAuthAdminService);
  
  isAdmin$ = this.adminService.isCurrentUserAdmin$();
  
  resetEmail = '';
  targetUserId = '';
  selectedRole = 'user';
  checkUserId = '';
  checkPermission = '';
  permissionResult: boolean | null = null;

  ngOnInit() {
    // Check if current user is admin
    this.adminService.isCurrentUserAdmin().then(isAdmin => {
      console.log('User is admin:', isAdmin);
    });
  }

  async sendPasswordReset() {
    try {
      await this.adminService.sendPasswordResetEmail(this.resetEmail);
      alert('Password reset email sent');
      this.resetEmail = '';
    } catch (error) {
      console.error('Failed to send reset email:', error);
    }
  }

  async assignRole() {
    try {
      const permissions = this.getPermissionsForRole(this.selectedRole);
      await this.adminService.assignUserRole(
        this.targetUserId,
        this.selectedRole,
        permissions
      );
      alert('Role assigned successfully');
      this.targetUserId = '';
    } catch (error) {
      console.error('Failed to assign role:', error);
    }
  }

  async checkUserPermission() {
    try {
      this.permissionResult = await this.adminService.hasPermissionAsync(
        this.checkUserId,
        this.checkPermission
      );
    } catch (error) {
      console.error('Failed to check permission:', error);
    }
  }

  private getPermissionsForRole(role: string): string[] {
    const permissionMap: Record<string, string[]> = {
      'admin': ['*'], // All permissions
      'moderator': ['read:posts', 'edit:posts', 'delete:comments', 'ban:users'],
      'user': ['read:posts', 'create:posts', 'edit:own:posts']
    };
    return permissionMap[role] || [];
  }
}
```

## Firestore Security Rules

To secure your role system, add these Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isSignedIn() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)/roles/current).data.role == 'admin';
    }
    
    function isSelf(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }
    
    // User profiles
    match /users/{userId} {
      allow read: if isSignedIn();
      allow write: if isSelf(userId) || isAdmin();
      
      // User roles
      match /roles/current {
        allow read: if isSignedIn();
        allow write: if isAdmin(); // Only admins can assign roles
      }
    }
  }
}
```

## Permission Naming Convention

Use a consistent naming convention for permissions:

- `read:<resource>` - View resources
- `create:<resource>` - Create new resources
- `edit:<resource>` - Modify resources
- `delete:<resource>` - Remove resources
- `edit:own:<resource>` - Modify own resources only
- `*` - All permissions (admin)

Examples:
- `read:posts`
- `create:posts`
- `edit:own:posts`
- `delete:comments`
- `ban:users`
- `manage:settings`

## Observable Utilities

For reactive permission checking in templates:

```typescript
// In your component
canEditPosts$ = this.adminService.hasPermission(userId, 'edit:posts');

// In template
<button *ngIf="canEditPosts$ | async" (click)="editPost()">
  Edit Post
</button>
```

## Error Handling

Common errors to handle:

```typescript
try {
  await this.adminService.updateUserPassword('newPassword');
} catch (error: any) {
  switch (error.code) {
    case 'auth/requires-recent-login':
      // User needs to re-authenticate
      break;
    case 'auth/weak-password':
      // Password is too weak
      break;
    case 'auth/operation-not-allowed':
      // Operation not enabled in Firebase Console
      break;
    default:
      console.error('Unexpected error:', error);
  }
}
```

## Notes

1. **Security**: Password reset and role assignment should only be accessible to authenticated admins
2. **Re-authentication**: Sensitive operations require recent authentication
3. **Firestore Rules**: Implement proper security rules to prevent unauthorized role changes
4. **Permissions**: Design a clear permission structure that matches your app's needs
5. **Batch Operations**: Use batch operations for bulk role assignments to improve performance
