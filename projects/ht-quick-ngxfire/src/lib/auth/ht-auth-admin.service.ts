import { inject, Injectable } from '@angular/core';
import { Auth, User } from '@angular/fire/auth';
import {
  sendPasswordResetEmail,
  updatePassword,
  updateEmail,
  updateProfile,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  createUserWithEmailAndPassword
} from '@angular/fire/auth';
import { where } from '@angular/fire/firestore';
import { HtFirestoreService } from '../firestore/ht-quick-firestore.service';
import { FireStoreBatchOperation } from '../firestore/batch-operations.model';
import { Observable, firstValueFrom } from 'rxjs';
import { HtQuickNgxFireError } from '../ht-quick-ngxfire.error';

export interface UserRole {
  role: string;
  permissions?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role?: UserRole;
  disabled?: boolean;
  createdAt?: Date;
  lastLogin?: Date;
  metadata?: Record<string, unknown>;
}

@Injectable({
  providedIn: 'root'
})
export class HtAuthAdminService {
  private auth = inject(Auth);
  private firestoreService = inject(HtFirestoreService);

  constructor() {
    // intentionally empty
  }

  /**
   * Send password reset email to a user
   * @param email User's email address
   * @param actionCodeSettings Optional settings for the password reset link
   */
  async sendPasswordResetEmail(
    email: string,
    actionCodeSettings?: {
      url: string;
      handleCodeInApp?: boolean;
    }
  ): Promise<void> {
    return await sendPasswordResetEmail(this.auth, email, actionCodeSettings);
  }

  /**
   * Invite a user to the application by creating an account and sending password reset email
   * This creates the user account with a temporary password, then sends them a password reset email
   * so they can set their own password on first login
   * @param email User's email address
   * @param role Optional role to assign (defaults to 'user')
   * @param permissions Optional permissions array
   * @param actionCodeSettings Optional settings for the password reset link
   * @returns The created user's UID
   */
  async inviteUserByEmail(
    email: string,
    role: string = 'user',
    permissions?: string[],
    actionCodeSettings?: {
      url: string;
      handleCodeInApp?: boolean;
    }
  ): Promise<string> {
    // Generate a temporary random password
    const tempPassword = this.generateTempPassword();

    // Create the user account
    const userCredential = await createUserWithEmailAndPassword(this.auth, email, tempPassword);
    const userId = userCredential.user.uid;

    try {
      // Create user profile in Firestore with assigned role
      await this.firestoreService.setDoc(`users/${userId}`, {
        uid: userId,
        email: email,
        role: role,
        permissions: permissions || ['read:posts', 'create:posts', 'edit:own:posts'],
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        invited: true
      });

      // Send password reset email so user can set their own password
      await sendPasswordResetEmail(this.auth, email, actionCodeSettings);

      return userId;
    } catch (error) {
      // If Firestore setup fails, delete the created auth user to maintain consistency
      await deleteUser(userCredential.user);
      throw error;
    }
  }

  /**
   * Generate a secure temporary password
   * This password will be reset by the user via email
   */
  private generateTempPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    const array = new Uint32Array(32);
    crypto.getRandomValues(array);
    for (let i = 0; i < 32; i++) {
      password += chars[array[i] % chars.length];
    }
    return password;
  }

  /**
   * Update the current user's password (requires recent authentication)
   * @param newPassword The new password
   */
  async updateUserPassword(newPassword: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new HtQuickNgxFireError('No user is currently signed in', 'no-user');
    return await updatePassword(user, newPassword);
  }

  /**
   * Update user's email address (requires recent authentication)
   * @param newEmail The new email address
   */
  async updateUserEmail(newEmail: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new HtQuickNgxFireError('No user is currently signed in', 'no-user');
    return await updateEmail(user, newEmail);
  }

  /**
   * Update user's profile information
   * @param profile Object with displayName and/or photoURL
   */
  async updateUserProfile(profile: {
    displayName?: string | null;
    photoURL?: string | null;
  }): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new HtQuickNgxFireError('No user is currently signed in', 'no-user');
    return await updateProfile(user, profile);
  }

  /**
   * Reauthenticate user with email and password
   * Required before sensitive operations like password change
   * @param email User's email
   * @param password User's current password
   */
  async reauthenticateUser(email: string, password: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new HtQuickNgxFireError('No user is currently signed in', 'no-user');

    const credential = EmailAuthProvider.credential(email, password);
    await reauthenticateWithCredential(user, credential);
  }

  /**
   * Delete the current user account
   * Requires recent authentication
   */
  async deleteCurrentUser(): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new HtQuickNgxFireError('No user is currently signed in', 'no-user');
    await deleteUser(user);
  }

  // ==================== ROLE MANAGEMENT ====================

  /**
   * Assign a role to a user in Firestore
   * @param userId User's UID
   * @param role Role to assign
   * @param permissions Optional array of permission strings
   */
  async assignUserRole(
    userId: string,
    role: 'admin' | 'user' | 'moderator' | string,
    permissions?: string[]
  ): Promise<void> {
    await this.firestoreService.updateDoc(`users/${userId}`, {
      role,
      permissions: permissions || [],
      updatedAt: new Date()
    });
  }

  /**
   * Get user's role from Firestore
   * @param userId User's UID
   */
  getUserRole(userId: string): Observable<UserRole | undefined> {
    return this.firestoreService.getDocData(`users/${userId}`) as Observable<UserRole | undefined>;
  }

  /**
   * Get user's role (Promise version)
   * @param userId User's UID
   */
  async getUserRoleAsync(userId: string): Promise<UserRole | null> {
    try {
      const role = await firstValueFrom(this.getUserRole(userId));
      return role || null;
    } catch {
      return null;
    }
  }

  /**
   * Remove user's role
   * @param userId User's UID
   */
  async removeUserRole(userId: string): Promise<void> {
    await this.firestoreService.updateDoc(`users/${userId}`, {
      role: null,
      permissions: [],
      updatedAt: new Date()
    });
  }

  /**
   * Update user's permissions
   * @param userId User's UID
   * @param permissions Array of permission strings
   */
  async updateUserPermissions(userId: string, permissions: string[]): Promise<void> {
    const currentRole = await this.getUserRoleAsync(userId);
    if (!currentRole) {
      throw new HtQuickNgxFireError('User has no role assigned', 'no-role');
    }

    await this.firestoreService.updateDoc(`users/${userId}`, {
      permissions,
      updatedAt: new Date()
    });
  }

  /**
   * Add permissions to user
   * @param userId User's UID
   * @param permissions Permissions to add
   */
  async addUserPermissions(userId: string, permissions: string[]): Promise<void> {
    const currentRole = await this.getUserRoleAsync(userId);
    if (!currentRole) {
      throw new HtQuickNgxFireError('User has no role assigned', 'no-role');
    }

    const existingPermissions = currentRole.permissions || [];
    const newPermissions = [...new Set([...existingPermissions, ...permissions])];

    await this.updateUserPermissions(userId, newPermissions);
  }

  /**
   * Remove permissions from user
   * @param userId User's UID
   * @param permissions Permissions to remove
   */
  async removeUserPermissions(userId: string, permissions: string[]): Promise<void> {
    const currentRole = await this.getUserRoleAsync(userId);
    if (!currentRole) {
      throw new HtQuickNgxFireError('User has no role assigned', 'no-role');
    }

    const existingPermissions = currentRole.permissions || [];
    const newPermissions = existingPermissions.filter(p => !permissions.includes(p));

    await this.updateUserPermissions(userId, newPermissions);
  }

  /**
   * Check if user has a specific role
   * @param userId User's UID
   * @param role Role to check
   */
  async hasRole(userId: string, role: string): Promise<boolean> {
    const userRole = await this.getUserRoleAsync(userId);
    return userRole?.role === role;
  }

  /**
   * Check if user has a specific permission
   * @param userId User's UID
   * @param permission Permission to check
   */
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const userRole = await this.getUserRoleAsync(userId);
    return userRole?.permissions?.includes(permission) || false;
  }

  /**
   * Check if user has any of the specified permissions
   * @param userId User's UID
   * @param permissions Array of permissions to check
   */
  async hasAnyPermission(userId: string, permissions: string[]): Promise<boolean> {
    const userRole = await this.getUserRoleAsync(userId);
    if (!userRole?.permissions) return false;
    return permissions.some(p => userRole.permissions?.includes(p));
  }

  /**
   * Check if user has all of the specified permissions
   * @param userId User's UID
   * @param permissions Array of permissions to check
   */
  async hasAllPermissions(userId: string, permissions: string[]): Promise<boolean> {
    const userRole = await this.getUserRoleAsync(userId);
    if (!userRole?.permissions) return false;
    return permissions.every(p => userRole.permissions?.includes(p));
  }

  // ==================== USER PROFILE MANAGEMENT ====================

  /**
   * Create or update user profile in Firestore
   * @param userId User's UID
   * @param profile User profile data
   */
  async setUserProfile(userId: string, profile: Partial<UserProfile>): Promise<void> {
    const profileData = {
      ...profile,
      uid: userId,
      updatedAt: new Date()
    };

    await this.firestoreService.setDoc(`users/${userId}`, profileData);
  }

  /**
   * Get user profile from Firestore
   * @param userId User's UID
   */
  getUserProfile(userId: string): Observable<UserProfile | undefined> {
    return this.firestoreService.getDocData(`users/${userId}`) as Observable<UserProfile | undefined>;
  }

  /**
   * Update user profile fields
   * @param userId User's UID
   * @param updates Partial profile data to update
   */
  async updateUserProfileFields(userId: string, updates: Partial<UserProfile>): Promise<void> {
    await this.firestoreService.updateDoc(`users/${userId}`, {
      ...updates,
      updatedAt: new Date()
    });
  }

  /**
   * Disable/enable user account (in Firestore)
   * Note: This doesn't disable Firebase Auth, only marks user as disabled in your DB
   * @param userId User's UID
   * @param disabled Whether to disable the account
   */
  async setUserDisabled(userId: string, disabled: boolean): Promise<void> {
    await this.updateUserProfileFields(userId, { disabled });
  }

  /**
   * Get all users with a specific role
   * @param role Role to filter by
   */
  getUsersByRole(role: string): Observable<UserProfile[]> {
    const q = this.firestoreService.createQuery('users', where('role', '==', role));
    return this.firestoreService.getCollectionData<UserProfile>(q);
  }

  /**
   * Batch assign roles to multiple users
   * @param userRoles Array of user IDs and their roles
   */
  async batchAssignRoles(
    userRoles: Array<{ userId: string; role: string; permissions?: string[] }>
  ): Promise<void> {
    const operations = userRoles.map(({ userId, role, permissions }) =>
      new FireStoreBatchOperation(
        'update',
        `users/${userId}`,
        {
          role,
          permissions: permissions || [],
          updatedAt: new Date()
        }
      )
    );

    await this.firestoreService.writeBatch(operations);
  }

  /**
   * Get current user's role
   */
  async getCurrentUserRole(): Promise<UserRole | null> {
    const user = this.auth.currentUser;
    if (!user) return null;
    return await this.getUserRoleAsync(user.uid);
  }

  /**
   * Check if current user is admin
   */
  async isCurrentUserAdmin(): Promise<boolean> {
    const user = this.auth.currentUser;
    if (!user) return false;
    return await this.hasRole(user.uid, 'admin');
  }

  /**
   * Check if current user has permission
   * @param permission Permission to check
   */
  async currentUserHasPermission(permission: string): Promise<boolean> {
    const user = this.auth.currentUser;
    if (!user) return false;
    return await this.hasPermission(user.uid, permission);
  }
}
