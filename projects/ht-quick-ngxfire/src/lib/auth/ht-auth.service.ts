import { inject, Injectable, Injector, runInInjectionContext, Signal } from '@angular/core';
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
import { Observable, of } from 'rxjs';
import { AUTH_OPTIONS } from '../ht-quick-ngxfire.providers';
import { SimulationStatusService } from '../simulation/simulation-status.service';
import { SimAuthBackend } from '../simulation/auth/sim-auth.backend';

@Injectable({
  providedIn: 'root'
})
export class HtAuthService {
  private status = inject(SimulationStatusService);
  private auth = inject(Auth, { optional: true });
  private simBackend = this.status.get('auth') === 'simulated'
    ? inject(SimAuthBackend)
    : null;
  private authOptions = inject(AUTH_OPTIONS, { optional: true });
  private readonly injector = inject(Injector);

  readonly user$: Observable<User | null> = this.simBackend
    ? (this.simBackend.user$ as unknown as Observable<User | null>)
    : (this.auth ? authState(this.auth) : of(null));
  readonly currentUser: Signal<User | null> = toSignal(this.user$, {
    initialValue: null,
    // HtAuthService is providedIn: 'root', so its lifetime matches the app and
    // DestroyRef-based cleanup is meaningless. manualCleanup skips the DestroyRef
    // lookup that trips NG0203 ("toSignal() can only be used within an injection
    // context") in class-field initializers under some bundling paths (e.g.
    // Capacitor's WebView) on Angular 20+.
    manualCleanup: true,
  });

  /**
   * Sign in with an SSO provider (Google, Facebook, Twitter, GitHub, Microsoft, Apple).
   */
  async signInWithProvider(providerId: string, preferRedirect?: boolean): Promise<UserCredential> {
    if (this.simBackend) {
      const cred = await this.simBackend.signInWithProvider(providerId, preferRedirect);
      return cred as unknown as UserCredential;
    }
    if (!this.auth) throw new Error('Auth is not available');
    const provider = this.createProvider(providerId);
    const useRedirect = preferRedirect ?? this.authOptions?.preferRedirect ?? false;

    if (useRedirect) {
      await runInInjectionContext(this.injector, () => signInWithRedirect(this.auth!, provider));
      return undefined as unknown as UserCredential;
    }

    return runInInjectionContext(this.injector, () => signInWithPopup(this.auth!, provider));
  }

  async signInWithEmail(email: string, password: string): Promise<UserCredential> {
    if (this.simBackend) {
      const cred = await this.simBackend.signInWithEmail(email, password);
      return cred as unknown as UserCredential;
    }
    if (!this.auth) throw new Error('Auth is not available');
    return runInInjectionContext(this.injector, () => signInWithEmailAndPassword(this.auth!, email, password));
  }

  async createAccount(email: string, password: string): Promise<UserCredential> {
    if (this.simBackend) {
      const cred = await this.simBackend.createAccount(email, password);
      return cred as unknown as UserCredential;
    }
    if (!this.auth) throw new Error('Auth is not available');
    return runInInjectionContext(this.injector, () => createUserWithEmailAndPassword(this.auth!, email, password));
  }

  async signOut(): Promise<void> {
    if (this.simBackend) return this.simBackend.signOut();
    if (!this.auth) return;
    return runInInjectionContext(this.injector, () => signOut(this.auth!));
  }

  async sendPasswordReset(email: string): Promise<void> {
    if (this.simBackend) return this.simBackend.sendPasswordReset(email);
    if (!this.auth) throw new Error('Auth is not available');
    return runInInjectionContext(this.injector, () => sendPasswordResetEmail(this.auth!, email));
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
