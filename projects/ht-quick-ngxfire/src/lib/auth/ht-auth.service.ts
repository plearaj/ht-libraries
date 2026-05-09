import { inject, Injectable, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Auth, User, UserCredential, authState } from '@angular/fire/auth';
import {
  signInWithPopup,
  signInWithRedirect,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  FacebookAuthProvider,
  TwitterAuthProvider,
  GithubAuthProvider,
  OAuthProvider
} from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { AUTH_OPTIONS } from '../ht-quick-ngxfire.providers';

@Injectable({
  providedIn: 'root'
})
export class HtAuthService {
  private auth = inject(Auth);
  private authOptions = inject(AUTH_OPTIONS, { optional: true });

  readonly user$: Observable<User | null> = authState(this.auth);
  readonly currentUser: Signal<User | null> = toSignal(this.user$, { initialValue: null });

  /**
   * Sign in with an SSO provider (Google, Facebook, Twitter, GitHub, Microsoft, Apple).
   * @param providerId Provider ID string (e.g., 'google.com', 'github.com')
   * @param preferRedirect Per-call override; defaults to AuthOptions.preferRedirect
   */
  async signInWithProvider(providerId: string, preferRedirect?: boolean): Promise<UserCredential> {
    const provider = this.createProvider(providerId);
    const useRedirect = preferRedirect ?? this.authOptions?.preferRedirect ?? false;

    if (useRedirect) {
      await signInWithRedirect(this.auth, provider);
      // signInWithRedirect doesn't return a UserCredential directly;
      // the result comes via getRedirectResult() on page reload.
      // This is expected behavior — consumers using redirect should handle auth state via user$/currentUser.
      return undefined as unknown as UserCredential;
    }

    return signInWithPopup(this.auth, provider);
  }

  /**
   * Sign in with email and password.
   */
  async signInWithEmail(email: string, password: string): Promise<UserCredential> {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  /**
   * Create a new account with email and password.
   */
  async createAccount(email: string, password: string): Promise<UserCredential> {
    return createUserWithEmailAndPassword(this.auth, email, password);
  }

  /**
   * Sign out the current user.
   */
  async signOut(): Promise<void> {
    return signOut(this.auth);
  }

  /**
   * Send password reset email.
   */
  async sendPasswordReset(email: string): Promise<void> {
    return sendPasswordResetEmail(this.auth, email);
  }

  private createProvider(providerId: string) {
    switch (providerId) {
      case 'google.com':
        return new GoogleAuthProvider();
      case 'facebook.com':
        return new FacebookAuthProvider();
      case 'twitter.com':
        return new TwitterAuthProvider();
      case 'github.com':
        return new GithubAuthProvider();
      case 'microsoft.com':
        return new OAuthProvider('microsoft.com');
      case 'apple.com':
        return new OAuthProvider('apple.com');
      default:
        return new OAuthProvider(providerId);
    }
  }
}
