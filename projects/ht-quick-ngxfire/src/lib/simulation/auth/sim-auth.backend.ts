import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HtQuickNgxFireError } from '../../ht-quick-ngxfire.error';

/**
 * SimAuthBackend — in-memory simulated Auth (E7 in data-model).
 *
 * Plain `@Injectable()` (NOT providedIn: 'root') — registered conditionally
 * by `provideHtQuickNgxFire` only when the activation decision resolves
 * `services.auth === 'simulated'`. This keeps the simulation subtree
 * tree-shakeable per FR-016.
 *
 * Methods resolve on the next microtask via `queueMicrotask` so loading
 * states are observable (Edge Cases "Concurrent sign-in attempts").
 *
 * Deterministic uid (FR-009 / R8): the same email or `${providerId}:${displayName}`
 * always maps to the same synthesized `sim-uid-${counter}` for the page session.
 */

export interface SimUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  providerId: string;
  providerData: Array<{ providerId: string; uid: string; email: string | null; displayName: string | null; photoURL: string | null }>;
  metadata: { creationTime?: string; lastSignInTime?: string };
}

export interface SimUserCredential {
  user: SimUser;
  providerId: string | null;
  operationType: 'signIn' | 'link' | 'reauthenticate';
  additionalUserInfo?: { isNewUser: boolean; providerId: string | null };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class SimAuthBackend {
  private currentUser$ = new BehaviorSubject<SimUser | null>(null);
  private uidByIdentifier = new Map<string, string>();
  private uidCounter = 0;

  readonly user$: Observable<SimUser | null> = this.currentUser$.asObservable();

  signInWithEmail(email: string, password: string): Promise<SimUserCredential> {
    return this.deferred(() => {
      this.validateEmail(email);
      this.validatePassword(password);
      const user = this.buildUser(email, 'password');
      this.currentUser$.next(user);
      return this.toCredential(user, 'password', false);
    });
  }

  createAccount(email: string, password: string): Promise<SimUserCredential> {
    return this.deferred(() => {
      this.validateEmail(email);
      this.validatePassword(password);
      const isNew = !this.uidByIdentifier.has(`email:${email}`);
      const user = this.buildUser(email, 'password');
      this.currentUser$.next(user);
      return this.toCredential(user, 'password', isNew);
    });
  }

  signInWithProvider(providerId: string, _preferRedirect?: boolean): Promise<SimUserCredential> {
    return this.deferred(() => {
      const synthName = `Sim ${providerId}`;
      const user = this.buildUser(`${providerId}:${synthName}`, providerId, synthName);
      this.currentUser$.next(user);
      return this.toCredential(user, providerId, false);
    });
  }

  signOut(): Promise<void> {
    return this.deferred(() => { this.currentUser$.next(null); });
  }

  sendPasswordReset(_email: string): Promise<void> {
    return this.deferred(() => { /* no-op; no email is sent in simulation */ });
  }

  /**
   * FR-009 / R8: deterministic uid keyed by email or `providerId:displayName`.
   * Same key in same session ⇒ same uid.
   */
  private buildUser(identifier: string, providerId: string, displayNameOverride?: string): SimUser {
    let uid = this.uidByIdentifier.get(identifier);
    if (!uid) {
      this.uidCounter += 1;
      uid = `sim-uid-${this.uidCounter}`;
      this.uidByIdentifier.set(identifier, uid);
    }
    const isEmailIdentifier = identifier.includes('@') && !identifier.includes(':');
    const email = isEmailIdentifier ? identifier : null;
    const displayName = displayNameOverride ?? (email ? email.split('@')[0] : null);
    const now = new Date().toISOString();
    return {
      uid,
      email,
      displayName,
      photoURL: null,
      emailVerified: false,
      isAnonymous: false,
      providerId,
      providerData: [{ providerId, uid, email, displayName, photoURL: null }],
      metadata: { creationTime: now, lastSignInTime: now },
    };
  }

  private toCredential(user: SimUser, providerId: string, isNewUser: boolean): SimUserCredential {
    return {
      user,
      providerId,
      operationType: 'signIn',
      additionalUserInfo: { isNewUser, providerId },
    };
  }

  private validateEmail(email: string): void {
    if (!email || !EMAIL_REGEX.test(email)) {
      throw new HtQuickNgxFireError(`Invalid email: ${email}`, 'auth/invalid-email');
    }
  }

  private validatePassword(password: string): void {
    if (!password) {
      throw new HtQuickNgxFireError('Password is required', 'auth/missing-password');
    }
  }

  private deferred<T>(fn: () => T): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queueMicrotask(() => {
        try { resolve(fn()); } catch (err) { reject(err); }
      });
    });
  }
}
