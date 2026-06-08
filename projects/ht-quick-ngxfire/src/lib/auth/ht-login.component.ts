import { ChangeDetectionStrategy, Component, ElementRef, inject, Injector, input, output, runInInjectionContext, signal, viewChild } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthOptions } from '../firebase-config.model';
import { AuthResult } from './auth-result.model';
import { HtAuthService } from './ht-auth.service';
import { SimulationStatusService } from '../simulation/simulation-status.service';
import { UserCredential, getAdditionalUserInfo } from '@angular/fire/auth';

type EmailFormMode = 'sign-in' | 'sign-up' | 'password-reset';

interface SsoProvider {
  id: string;
  label: string;
  flag: keyof AuthOptions;
  bg: string;
  color: string;
  border: string;
  hoverBg: string;
  svg: string;
}

/* eslint-disable max-len */
const SSO_PROVIDERS: SsoProvider[] = [
  {
    id: 'google.com', label: 'Google', flag: 'google',
    bg: '#ffffff', color: '#3c4043', border: '#dadce0', hoverBg: '#f7f8f8',
    svg: `<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.1 24.1 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`,
  },
  {
    id: 'facebook.com', label: 'Facebook', flag: 'facebook',
    bg: '#1877F2', color: '#ffffff', border: '#1877F2', hoverBg: '#166FE5',
    svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
  },
  {
    id: 'twitter.com', label: 'X', flag: 'twitter',
    bg: '#000000', color: '#ffffff', border: '#000000', hoverBg: '#1a1a1a',
    svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  },
  {
    id: 'github.com', label: 'GitHub', flag: 'github',
    bg: '#24292f', color: '#ffffff', border: '#24292f', hoverBg: '#2f363d',
    svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`,
  },
  {
    id: 'microsoft.com', label: 'Microsoft', flag: 'microsoft',
    bg: '#ffffff', color: '#5e5e5e', border: '#8c8c8c', hoverBg: '#f2f2f2',
    svg: `<svg width="18" height="18" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>`,
  },
  {
    id: 'apple.com', label: 'Apple', flag: 'apple',
    bg: '#000000', color: '#ffffff', border: '#000000', hoverBg: '#1a1a1a',
    svg: `<svg width="16" height="18" viewBox="0 0 17 20" fill="#fff"><path d="M13.545 10.239c-.023-2.395 1.953-3.544 2.042-3.6-1.113-1.628-2.847-1.851-3.463-1.877-1.474-.149-2.878.868-3.625.868-.746 0-1.9-.846-3.122-.823-1.607.023-3.089.935-3.914 2.374-1.67 2.896-.427 7.187 1.2 9.538.795 1.15 1.744 2.44 2.99 2.394 1.2-.048 1.652-.776 3.1-.776 1.45 0 1.855.776 3.12.752 1.292-.023 2.11-1.17 2.9-2.324.914-1.333 1.29-2.624 1.312-2.69-.028-.013-2.517-.966-2.54-3.836zM11.15 3.292c.661-.802 1.107-1.913.985-3.022-.952.039-2.105.634-2.788 1.434-.612.71-1.148 1.842-1.003 2.928 1.062.083 2.146-.54 2.806-1.34z"/></svg>`,
  },
];
/* eslint-enable max-len */

@Component({
  selector: 'ht-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ht-login" role="form" aria-label="Sign in">
      @if (status.get('auth') === 'simulated' && showSimulationBadge()) {
        <span class="ht-login__sim-badge" role="status" aria-label="Simulation mode active">Simulation mode</span>
      }
      @if (enabledSsoProviders().length > 0) {
        <div class="ht-login__sso">
          @for (provider of enabledSsoProviders(); track provider.id) {
            <button
              type="button"
              class="ht-login__sso-btn"
              [style.background]="provider.bg"
              [style.color]="provider.color"
              [style.border-color]="provider.border"
              [attr.aria-label]="'Sign in with ' + provider.label"
              [disabled]="loading()"
              (click)="onSsoClick(provider.id)">
              <span class="ht-login__sso-icon" [innerHTML]="trustedSvg(provider.svg)"></span>
              <span>Sign in with {{ provider.label }}</span>
            </button>
          }
        </div>
      }

      @if (authOptions().email) {
        @if (enabledSsoProviders().length > 0) {
          <div class="ht-login__divider" aria-hidden="true">
            <span>or</span>
          </div>
        }

        <form class="ht-login__email-form" (submit)="onEmailSubmit($event)">
          @if (emailMode() !== 'password-reset' || emailMode() === 'password-reset') {
            <label class="ht-login__label" for="ht-login-email">Email</label>
            <input
              id="ht-login-email"
              class="ht-login__input"
              type="email"
              required
              autocomplete="email"
              [disabled]="loading()"
              [value]="email()"
              (input)="email.set(asInputValue($event))"
              aria-required="true" />
          }

          @if (emailMode() === 'sign-in') {
            <label class="ht-login__label" for="ht-login-password">Password</label>
            <input
              id="ht-login-password"
              class="ht-login__input"
              type="password"
              required
              autocomplete="current-password"
              [disabled]="loading()"
              [value]="password()"
              (input)="password.set(asInputValue($event))"
              aria-required="true" />

            <button type="submit" class="ht-login__btn ht-login__btn--primary" [disabled]="loading()" aria-label="Sign in with email">
              Sign in
            </button>

            <div class="ht-login__links">
              <button type="button" class="ht-login__link" [disabled]="loading()" (click)="setEmailMode('password-reset')" aria-label="Forgot password?">
                Forgot password?
              </button>
              <button type="button" class="ht-login__link" [disabled]="loading()" (click)="setEmailMode('sign-up')" aria-label="Create account">
                Create account
              </button>
            </div>
          }

          @if (emailMode() === 'sign-up') {
            <label class="ht-login__label" for="ht-login-password">Password</label>
            <input
              id="ht-login-password"
              class="ht-login__input"
              type="password"
              required
              autocomplete="new-password"
              [disabled]="loading()"
              [value]="password()"
              (input)="password.set(asInputValue($event))"
              aria-required="true" />

            <label class="ht-login__label" for="ht-login-confirm-password">Confirm password</label>
            <input
              id="ht-login-confirm-password"
              class="ht-login__input"
              type="password"
              required
              autocomplete="new-password"
              [disabled]="loading()"
              [value]="confirmPassword()"
              (input)="confirmPassword.set(asInputValue($event))"
              aria-required="true" />

            @if (passwordMismatch()) {
              <p class="ht-login__error" role="alert">Passwords do not match.</p>
            }

            <button type="submit" class="ht-login__btn ht-login__btn--primary" [disabled]="loading()" aria-label="Create account">
              Create account
            </button>

            <div class="ht-login__links">
              <button type="button" class="ht-login__link" [disabled]="loading()" (click)="setEmailMode('sign-in')" aria-label="Already have an account?">
                Already have an account?
              </button>
            </div>
          }

          @if (emailMode() === 'password-reset') {
            <button type="submit" class="ht-login__btn ht-login__btn--primary" [disabled]="loading()" aria-label="Send reset link">
              Send reset link
            </button>

            @if (resetSent()) {
              <p class="ht-login__success" role="status">Password reset email sent. Check your inbox.</p>
            }

            <div class="ht-login__links">
              <button type="button" class="ht-login__link" [disabled]="loading()" (click)="setEmailMode('sign-in')" aria-label="Back to sign in">
                Back to sign in
              </button>
            </div>
          }
        </form>
      }

      @if (loading()) {
        <div class="ht-login__loading" aria-live="polite" aria-label="Signing in...">
          <div class="ht-login__spinner"></div>
        </div>
      }

      @if (errorMessage()) {
        <div #errorContainer class="ht-login__error-container" role="alert" aria-live="assertive" tabindex="-1">
          <p class="ht-login__error">{{ errorMessage() }}</p>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      --ht-login-primary: #1a73e8;
      --ht-login-secondary: #5f6368;
      --ht-login-error: #d93025;
      --ht-login-success: #188038;
      --ht-login-bg: #ffffff;
      --ht-login-text: #202124;
      --ht-login-border-radius: 4px;
      --ht-login-font-family: inherit;
      --ht-login-spacing: 12px;
      /* FR-019 simulation badge tokens. Defaults meet WCAG 2.1 AA contrast (≥ 4.5:1). */
      --ht-login-sim-badge-bg: #fef3c7;
      --ht-login-sim-badge-fg: #78350f;
      --ht-login-sim-badge-padding: 4px 8px;
      --ht-login-sim-badge-radius: 4px;
      --ht-login-sim-badge-font-size: 12px;
    }

    .ht-login__sim-badge {
      display: inline-block;
      padding: var(--ht-login-sim-badge-padding);
      background: var(--ht-login-sim-badge-bg);
      color: var(--ht-login-sim-badge-fg);
      border-radius: var(--ht-login-sim-badge-radius);
      font-size: var(--ht-login-sim-badge-font-size);
      font-weight: 600;
      margin-bottom: var(--ht-login-spacing);
    }

    .ht-login {
      font-family: var(--ht-login-font-family);
      color: var(--ht-login-text);
      background: var(--ht-login-bg);
      max-width: 400px;
    }

    .ht-login__sso {
      display: flex;
      flex-direction: column;
      gap: var(--ht-login-spacing);
    }

    .ht-login__sso-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 10px 16px;
      border: 1px solid;
      border-radius: var(--ht-login-border-radius);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: filter 0.15s, box-shadow 0.15s;
    }

    .ht-login__sso-btn:hover:not(:disabled) {
      filter: brightness(0.95);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
    }

    .ht-login__sso-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .ht-login__sso-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .ht-login__divider {
      display: flex;
      align-items: center;
      margin: calc(var(--ht-login-spacing) * 1.5) 0;
      color: var(--ht-login-secondary);
      font-size: 12px;
    }

    .ht-login__divider::before,
    .ht-login__divider::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid #dadce0;
    }

    .ht-login__divider span {
      padding: 0 12px;
    }

    .ht-login__email-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .ht-login__label {
      font-size: 12px;
      font-weight: 500;
      color: var(--ht-login-secondary);
    }

    .ht-login__input {
      padding: 10px 12px;
      border: 1px solid #dadce0;
      border-radius: var(--ht-login-border-radius);
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }

    .ht-login__input:focus {
      border-color: var(--ht-login-primary);
      box-shadow: 0 0 0 1px var(--ht-login-primary);
    }

    .ht-login__input:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .ht-login__btn {
      padding: 10px 16px;
      border: none;
      border-radius: var(--ht-login-border-radius);
      font-size: 14px;
      cursor: pointer;
      margin-top: 8px;
    }

    .ht-login__btn--primary {
      background: var(--ht-login-primary);
      color: #fff;
    }

    .ht-login__btn--primary:hover:not(:disabled) {
      opacity: 0.9;
    }

    .ht-login__btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .ht-login__links {
      display: flex;
      justify-content: space-between;
      margin-top: 4px;
    }

    .ht-login__link {
      background: none;
      border: none;
      color: var(--ht-login-primary);
      cursor: pointer;
      font-size: 13px;
      padding: 4px 0;
    }

    .ht-login__link:hover:not(:disabled) {
      text-decoration: underline;
    }

    .ht-login__link:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .ht-login__loading {
      display: flex;
      justify-content: center;
      padding: var(--ht-login-spacing);
    }

    .ht-login__spinner {
      width: 24px;
      height: 24px;
      border: 3px solid #dadce0;
      border-top-color: var(--ht-login-primary);
      border-radius: 50%;
      animation: ht-login-spin 0.8s linear infinite;
    }

    @keyframes ht-login-spin {
      to { transform: rotate(360deg); }
    }

    .ht-login__error-container {
      margin-top: var(--ht-login-spacing);
    }

    .ht-login__error {
      color: var(--ht-login-error);
      font-size: 13px;
      margin: 4px 0;
    }

    .ht-login__success {
      color: var(--ht-login-success);
      font-size: 13px;
      margin: 4px 0;
    }
  `]
})
export class HtLoginComponent {
  private authService = inject(HtAuthService);
  private sanitizer = inject(DomSanitizer);
  private errorContainerRef = viewChild<ElementRef>('errorContainer');
  private svgCache = new Map<string, SafeHtml>();
  private readonly injector = inject(Injector);

  /** Read by the template to render the FR-019 simulation badge. */
  protected readonly status = inject(SimulationStatusService);

  authOptions = input.required<AuthOptions>();
  /** FR-019: default-on, suppressible "Simulation mode" badge inside the component. */
  showSimulationBadge = input<boolean>(true);
  authResult = output<AuthResult>();

  loading = signal(false);
  errorMessage = signal('');
  emailMode = signal<EmailFormMode>('sign-in');
  email = signal('');
  password = signal('');
  confirmPassword = signal('');
  resetSent = signal(false);
  passwordMismatch = signal(false);

  trustedSvg(svg: string): SafeHtml {
    let cached = this.svgCache.get(svg);
    if (!cached) {
      cached = this.sanitizer.bypassSecurityTrustHtml(svg);
      this.svgCache.set(svg, cached);
    }
    return cached;
  }

  enabledSsoProviders = () => {
    const opts = this.authOptions();
    return SSO_PROVIDERS.filter(p => opts[p.flag]);
  };

  asInputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  setEmailMode(mode: EmailFormMode): void {
    this.emailMode.set(mode);
    this.errorMessage.set('');
    this.password.set('');
    this.confirmPassword.set('');
    this.resetSent.set(false);
    this.passwordMismatch.set(false);
  }

  async onSsoClick(providerId: string): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const credential = await this.authService.signInWithProvider(providerId);
      const additionalInfo = credential
        ? runInInjectionContext(this.injector, () => getAdditionalUserInfo(credential))
        : null;
      const isNewUser = additionalInfo?.isNewUser ?? false;
      this.authResult.emit({
        success: true,
        user: credential?.user ?? this.authService.currentUser(),
        isNewUser,
      });
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      this.errorMessage.set(error.message ?? 'Sign-in failed');
      this.authResult.emit({
        success: false,
        user: null,
        error: { code: error.code ?? 'unknown', message: error.message ?? 'Sign-in failed' },
      });
      this.focusErrorContainer();
    } finally {
      this.loading.set(false);
    }
  }

  async onEmailSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.loading()) return;

    const mode = this.emailMode();

    if (mode === 'sign-up') {
      if (this.password() !== this.confirmPassword()) {
        this.passwordMismatch.set(true);
        return;
      }
      this.passwordMismatch.set(false);
    }

    this.loading.set(true);
    this.errorMessage.set('');

    try {
      if (mode === 'sign-in') {
        const credential = await this.authService.signInWithEmail(this.email(), this.password());
        this.authResult.emit({ success: true, user: credential.user, isNewUser: false });
      } else if (mode === 'sign-up') {
        const credential = await this.authService.createAccount(this.email(), this.password());
        this.authResult.emit({ success: true, user: credential.user, isNewUser: true });
      } else if (mode === 'password-reset') {
        await this.authService.sendPasswordReset(this.email());
        this.resetSent.set(true);
      }
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      this.errorMessage.set(error.message ?? 'Operation failed');
      this.password.set('');
      this.confirmPassword.set('');
      this.authResult.emit({
        success: false,
        user: null,
        error: { code: error.code ?? 'unknown', message: error.message ?? 'Operation failed' },
      });
      this.focusErrorContainer();
    } finally {
      this.loading.set(false);
    }
  }

  private focusErrorContainer(): void {
    // Defer to next tick so the error container is rendered
    setTimeout(() => {
      this.errorContainerRef()?.nativeElement?.focus();
    });
  }
}
