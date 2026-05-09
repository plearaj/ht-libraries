/**
 * ht-quick-ngxfire API Contracts
 *
 * This file defines the public API surface of the library.
 * It serves as the contract between the library and consuming applications.
 */

import { Signal, OutputEmitterRef } from '@angular/core';
import { Observable } from 'rxjs';

// ─── Firebase Types (from @angular/fire) ───────────────────────────────

// Re-used from @angular/fire/auth
type User = import('@angular/fire/auth').User;
type UserCredential = import('@angular/fire/auth').UserCredential;
type FirebaseOptions = import('@angular/fire/app').FirebaseOptions;

// Re-used from @angular/fire/firestore
type DocumentReference = import('@angular/fire/firestore').DocumentReference;
type Query = import('@angular/fire/firestore').Query;
type QueryConstraint = import('@angular/fire/firestore').QueryConstraint;
type FirestoreDataConverter<T> = import('@angular/fire/firestore').FirestoreDataConverter<T, any>;

// ─── Configuration ─────────────────────────────────────────────────────

export interface AuthOptions {
  email?: boolean;
  google?: boolean;
  facebook?: boolean;
  twitter?: boolean;
  github?: boolean;
  microsoft?: boolean;
  apple?: boolean;
  preferRedirect?: boolean;
}

export interface FirebaseConfig {
  authOptions: AuthOptions;
  firebaseOptions: FirebaseOptions;
  firestore: boolean;
  database: boolean;
  functions: boolean;
  storage: boolean;
}

// ─── Auth Models ───────────────────────────────────────────────────────

export interface AuthResult {
  success: boolean;
  user: User | null;
  error?: { code: string; message: string };
  isNewUser?: boolean;
}

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

// ─── HtLoginComponent ─────────────────────────────────────────────────

/**
 * Selector: `ht-login`
 * Standalone: true
 * ChangeDetection: OnPush
 */
export interface HtLoginComponentContract {
  // Inputs (signal-based)
  authOptions: Signal<AuthOptions>;

  // Outputs
  authResult: OutputEmitterRef<AuthResult>;
}

// ─── HtAuthService ─────────────────────────────────────────────────────

export interface HtAuthServiceContract {
  /** Observable stream of current auth state */
  readonly user$: Observable<User | null>;

  /** Signal-based current user (from toSignal) */
  readonly currentUser: Signal<User | null>;

  /** Sign in with an SSO provider (Google, Facebook, etc.) */
  signInWithProvider(providerId: string, preferRedirect?: boolean): Promise<UserCredential>;

  /** Sign in with email and password */
  signInWithEmail(email: string, password: string): Promise<UserCredential>;

  /** Create a new account with email and password */
  createAccount(email: string, password: string): Promise<UserCredential>;

  /** Sign out the current user */
  signOut(): Promise<void>;

  /** Send password reset email */
  sendPasswordReset(email: string): Promise<void>;
}

// ─── HtAuthAdminService (unchanged) ────────────────────────────────────

export interface HtAuthAdminServiceContract {
  sendPasswordResetEmail(email: string, actionCodeSettings?: { url: string; handleCodeInApp?: boolean }): Promise<void>;
  inviteUserByEmail(email: string, role?: string, permissions?: string[], actionCodeSettings?: { url: string; handleCodeInApp?: boolean }): Promise<string>;
  updateUserPassword(newPassword: string): Promise<void>;
  updateUserEmail(newEmail: string): Promise<void>;
  updateUserProfile(profile: { displayName?: string | null; photoURL?: string | null }): Promise<void>;
  reauthenticateUser(email: string, password: string): Promise<void>;
  deleteCurrentUser(): Promise<void>;

  assignUserRole(userId: string, role: string, permissions?: string[]): Promise<void>;
  getUserRole(userId: string): Observable<UserRole | undefined>;
  getUserRoleAsync(userId: string): Promise<UserRole | null>;
  removeUserRole(userId: string): Promise<void>;
  updateUserPermissions(userId: string, permissions: string[]): Promise<void>;
  addUserPermissions(userId: string, permissions: string[]): Promise<void>;
  removeUserPermissions(userId: string, permissions: string[]): Promise<void>;
  hasRole(userId: string, role: string): Promise<boolean>;
  hasPermission(userId: string, permission: string): Promise<boolean>;
  hasAnyPermission(userId: string, permissions: string[]): Promise<boolean>;
  hasAllPermissions(userId: string, permissions: string[]): Promise<boolean>;

  setUserProfile(userId: string, profile: Partial<UserProfile>): Promise<void>;
  getUserProfile(userId: string): Observable<UserProfile | undefined>;
  updateUserProfileFields(userId: string, updates: Partial<UserProfile>): Promise<void>;
  setUserDisabled(userId: string, disabled: boolean): Promise<void>;
  getUsersByRole(role: string): Observable<UserProfile[]>;
  batchAssignRoles(userRoles: Array<{ userId: string; role: string; permissions?: string[] }>): Promise<void>;

  getCurrentUserRole(): Promise<UserRole | null>;
  isCurrentUserAdmin(): Promise<boolean>;
  currentUserHasPermission(permission: string): Promise<boolean>;
}

// ─── HtFirestoreService (unchanged API) ────────────────────────────────

export interface HtFirestoreServiceContract {
  createCollectionRef(path: string, converter?: FirestoreDataConverter<unknown>): unknown;
  getCollectionRef(path: string): unknown;
  createDocRef(path: string, id: string): DocumentReference;
  createQuery(path: string, ...args: unknown[]): Query;
  createCollectionGroupQuery(collectionId: string, ...queryConstraints: QueryConstraint[]): Query;
  getCollectionData<T>(pathOrQuery: string | Query, passId?: boolean): Observable<T[]>;
  getCollectionSnapshots<T>(query: Query): Observable<T[]>;
  getDocData(path: string, converter?: FirestoreDataConverter<unknown>, passId?: boolean): Observable<unknown>;
  getDocSnapshots(path: string, converter?: FirestoreDataConverter<unknown>, passId?: boolean): Observable<unknown>;
  addDoc(path: string, data: Record<string, unknown>): Promise<DocumentReference>;
  updateDoc(docPath: string, data: Record<string, unknown>): Promise<void>;
  setDoc(docPath: string, data: Record<string, unknown>): Promise<void>;
  deleteDoc(docPath: string): Promise<void>;
  writeBatch(writes: unknown[]): Promise<void>;
  runTransaction<T>(updateFunction: (transaction: unknown) => Promise<T>): Promise<T>;
  getCountFromServer(q: Query | string): Promise<number>;
}

// ─── Route Guards (functional) ─────────────────────────────────────────

// htAuthRedirectGuard: CanActivateFn — checks HtAuthService.currentUser
// htRoleGuard: CanActivateFn — checks user role from route data
// htAdminGuard: CanActivateFn — pre-configured for 'admin' role
// createRoleGuard(roles: string[], redirectTo?: string): CanActivateFn

// ─── Provider Function ─────────────────────────────────────────────────

// provideHtQuickNgxFire(config: FirebaseConfig): EnvironmentProviders
