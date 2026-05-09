import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HtLoginComponent } from './ht-login.component';
import { HtAuthService } from './ht-auth.service';
import { Auth, User } from '@angular/fire/auth';
import { AUTH_OPTIONS } from '../ht-quick-ngxfire.providers';
import { AuthOptions } from '../firebase-config.model';
import { AuthResult } from './auth-result.model';
import { signal } from '@angular/core';
import { ComponentRef } from '@angular/core';

describe('HtLoginComponent', () => {
  let fixture: ComponentFixture<HtLoginComponent>;
  let component: HtLoginComponent;
  let componentRef: ComponentRef<HtLoginComponent>;
  let mockAuthService: jasmine.SpyObj<HtAuthService>;

  const mockUser: Partial<User> = {
    uid: 'test-uid',
    email: 'test@example.com',
    displayName: 'Test User',
  };

  const mockCredential = {
    user: mockUser as User,
    providerId: 'google.com',
    operationType: 'signIn' as const,
  };

  function setupComponent(authOptions: AuthOptions): void {
    fixture = TestBed.createComponent(HtLoginComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('authOptions', authOptions);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('HtAuthService', [
      'signInWithProvider',
      'signInWithEmail',
      'createAccount',
      'signOut',
      'sendPasswordReset',
    ], {
      currentUser: signal(null),
    });

    const mockAuth = jasmine.createSpyObj('Auth', ['onAuthStateChanged'], {
      currentUser: null,
    });

    await TestBed.configureTestingModule({
      imports: [HtLoginComponent],
      providers: [
        { provide: HtAuthService, useValue: mockAuthService },
        { provide: Auth, useValue: mockAuth },
        { provide: AUTH_OPTIONS, useValue: {} },
      ],
    }).compileComponents();
  });

  describe('SSO buttons', () => {
    it('should render Google SSO button when google is enabled', () => {
      setupComponent({ google: true });
      const buttons = fixture.nativeElement.querySelectorAll('.ht-login__sso-btn');
      expect(buttons.length).toBe(1);
      expect(buttons[0].textContent).toContain('Google');
    });

    it('should render multiple SSO buttons for multiple providers', () => {
      setupComponent({ google: true, github: true, microsoft: true });
      const buttons = fixture.nativeElement.querySelectorAll('.ht-login__sso-btn');
      expect(buttons.length).toBe(3);
    });

    it('should render no SSO buttons when no providers are enabled', () => {
      setupComponent({ email: true });
      const buttons = fixture.nativeElement.querySelectorAll('.ht-login__sso-btn');
      expect(buttons.length).toBe(0);
    });

    it('should call authService.signInWithProvider on SSO click', async () => {
      // getAdditionalUserInfo returns null for mock credentials (no _tokenResponse), which is handled gracefully
      mockAuthService.signInWithProvider.and.resolveTo(mockCredential as any);

      setupComponent({ google: true });
      const button = fixture.nativeElement.querySelector('.ht-login__sso-btn');
      button.click();
      await fixture.whenStable();

      expect(mockAuthService.signInWithProvider).toHaveBeenCalledWith('google.com');
    });

    it('should emit authResult on successful SSO sign-in', async () => {
      mockAuthService.signInWithProvider.and.resolveTo(mockCredential as any);

      setupComponent({ google: true });

      let emittedResult: AuthResult | undefined;
      component.authResult.subscribe((result: AuthResult) => {
        emittedResult = result;
      });

      const button = fixture.nativeElement.querySelector('.ht-login__sso-btn');
      button.click();
      await fixture.whenStable();

      expect(emittedResult).toBeDefined();
      expect(emittedResult!.success).toBeTrue();
      expect(emittedResult!.user).toBeTruthy();
    });
  });

  describe('email form', () => {
    it('should render email form when email is enabled', () => {
      setupComponent({ email: true });
      const form = fixture.nativeElement.querySelector('.ht-login__email-form');
      expect(form).toBeTruthy();
    });

    it('should not render email form when email is disabled', () => {
      setupComponent({ google: true });
      const form = fixture.nativeElement.querySelector('.ht-login__email-form');
      expect(form).toBeFalsy();
    });

    it('should show divider when both SSO and email are enabled', () => {
      setupComponent({ google: true, email: true });
      const divider = fixture.nativeElement.querySelector('.ht-login__divider');
      expect(divider).toBeTruthy();
    });

    it('should show sign-in mode by default', () => {
      setupComponent({ email: true });
      const submitButton = fixture.nativeElement.querySelector('.ht-login__btn--primary');
      expect(submitButton.textContent.trim()).toBe('Sign in');
    });

    it('should switch to sign-up mode', () => {
      setupComponent({ email: true });
      const createAccountLink = fixture.nativeElement.querySelector('.ht-login__link[aria-label="Create account"]');
      createAccountLink.click();
      fixture.detectChanges();

      const submitButton = fixture.nativeElement.querySelector('.ht-login__btn--primary');
      expect(submitButton.textContent.trim()).toBe('Create account');

      const confirmInput = fixture.nativeElement.querySelector('#ht-login-confirm-password');
      expect(confirmInput).toBeTruthy();
    });

    it('should switch to password-reset mode', () => {
      setupComponent({ email: true });
      const forgotLink = fixture.nativeElement.querySelector('.ht-login__link[aria-label="Forgot password?"]');
      forgotLink.click();
      fixture.detectChanges();

      const submitButton = fixture.nativeElement.querySelector('.ht-login__btn--primary');
      expect(submitButton.textContent.trim()).toBe('Send reset link');
    });

    it('should call signInWithEmail on sign-in submit', async () => {
      mockAuthService.signInWithEmail.and.resolveTo(mockCredential as any);
      setupComponent({ email: true });

      component.email.set('test@example.com');
      component.password.set('password123');

      const form = fixture.nativeElement.querySelector('.ht-login__email-form');
      form.dispatchEvent(new Event('submit'));
      await fixture.whenStable();

      expect(mockAuthService.signInWithEmail).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should call createAccount on sign-up submit', async () => {
      mockAuthService.createAccount.and.resolveTo(mockCredential as any);
      setupComponent({ email: true });

      // Switch to sign-up mode
      component.setEmailMode('sign-up');
      fixture.detectChanges();

      component.email.set('new@example.com');
      component.password.set('password123');
      component.confirmPassword.set('password123');

      const form = fixture.nativeElement.querySelector('.ht-login__email-form');
      form.dispatchEvent(new Event('submit'));
      await fixture.whenStable();

      expect(mockAuthService.createAccount).toHaveBeenCalledWith('new@example.com', 'password123');
    });

    it('should show password mismatch error when passwords differ', async () => {
      setupComponent({ email: true });

      component.setEmailMode('sign-up');
      fixture.detectChanges();

      component.email.set('new@example.com');
      component.password.set('password123');
      component.confirmPassword.set('different');

      const form = fixture.nativeElement.querySelector('.ht-login__email-form');
      form.dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      const error = fixture.nativeElement.querySelector('.ht-login__error');
      expect(error).toBeTruthy();
      expect(error.textContent).toContain('Passwords do not match');
      expect(mockAuthService.createAccount).not.toHaveBeenCalled();
    });

    it('should call sendPasswordReset on password-reset submit', async () => {
      mockAuthService.sendPasswordReset.and.resolveTo();
      setupComponent({ email: true });

      component.setEmailMode('password-reset');
      fixture.detectChanges();

      component.email.set('test@example.com');

      const form = fixture.nativeElement.querySelector('.ht-login__email-form');
      form.dispatchEvent(new Event('submit'));
      await fixture.whenStable();
      fixture.detectChanges();

      expect(mockAuthService.sendPasswordReset).toHaveBeenCalledWith('test@example.com');
      const success = fixture.nativeElement.querySelector('.ht-login__success');
      expect(success).toBeTruthy();
      expect(success.textContent).toContain('Password reset email sent');
    });
  });

  describe('loading state', () => {
    it('should show spinner when loading', () => {
      setupComponent({ email: true });
      component.loading.set(true);
      fixture.detectChanges();

      const spinner = fixture.nativeElement.querySelector('.ht-login__spinner');
      expect(spinner).toBeTruthy();
    });

    it('should disable buttons when loading', () => {
      setupComponent({ google: true, email: true });
      component.loading.set(true);
      fixture.detectChanges();

      const ssoButton = fixture.nativeElement.querySelector('.ht-login__sso-btn');
      expect(ssoButton.disabled).toBeTrue();

      const submitButton = fixture.nativeElement.querySelector('.ht-login__btn--primary');
      expect(submitButton.disabled).toBeTrue();
    });

    it('should prevent duplicate submissions while loading', async () => {
      mockAuthService.signInWithEmail.and.callFake(async () => {
        // Simulate delay
        return new Promise(resolve => setTimeout(() => resolve(mockCredential as any), 100));
      });
      setupComponent({ email: true });

      component.email.set('test@example.com');
      component.password.set('password123');

      const form = fixture.nativeElement.querySelector('.ht-login__email-form');
      form.dispatchEvent(new Event('submit'));
      // Try submitting again while loading
      form.dispatchEvent(new Event('submit'));
      await fixture.whenStable();

      expect(mockAuthService.signInWithEmail).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should display error message on auth failure', async () => {
      mockAuthService.signInWithEmail.and.rejectWith({ code: 'auth/wrong-password', message: 'Wrong password' });
      setupComponent({ email: true });

      component.email.set('test@example.com');
      component.password.set('wrong');

      const form = fixture.nativeElement.querySelector('.ht-login__email-form');
      form.dispatchEvent(new Event('submit'));
      await fixture.whenStable();
      fixture.detectChanges();

      const errorContainer = fixture.nativeElement.querySelector('.ht-login__error-container');
      expect(errorContainer).toBeTruthy();
      expect(errorContainer.textContent).toContain('Wrong password');
    });

    it('should emit failure authResult on auth error', async () => {
      mockAuthService.signInWithEmail.and.rejectWith({ code: 'auth/wrong-password', message: 'Wrong password' });
      setupComponent({ email: true });

      let emittedResult: AuthResult | undefined;
      component.authResult.subscribe((result: AuthResult) => {
        emittedResult = result;
      });

      component.email.set('test@example.com');
      component.password.set('wrong');

      const form = fixture.nativeElement.querySelector('.ht-login__email-form');
      form.dispatchEvent(new Event('submit'));
      await fixture.whenStable();

      expect(emittedResult).toBeDefined();
      expect(emittedResult!.success).toBeFalse();
      expect(emittedResult!.error).toBeDefined();
      expect(emittedResult!.error!.code).toBe('auth/wrong-password');
    });

    it('should clear password fields after auth failure', async () => {
      mockAuthService.signInWithEmail.and.rejectWith({ code: 'auth/wrong-password', message: 'Wrong password' });
      setupComponent({ email: true });

      component.email.set('test@example.com');
      component.password.set('wrong');

      const form = fixture.nativeElement.querySelector('.ht-login__email-form');
      form.dispatchEvent(new Event('submit'));
      await fixture.whenStable();

      expect(component.password()).toBe('');
    });
  });

  describe('accessibility', () => {
    it('should have role="form" on container', () => {
      setupComponent({ email: true });
      const container = fixture.nativeElement.querySelector('[role="form"]');
      expect(container).toBeTruthy();
    });

    it('should have aria-labels on SSO buttons', () => {
      setupComponent({ google: true });
      const button = fixture.nativeElement.querySelector('.ht-login__sso-btn');
      expect(button.getAttribute('aria-label')).toBe('Sign in with Google');
    });

    it('should have aria-required on form inputs', () => {
      setupComponent({ email: true });
      const emailInput = fixture.nativeElement.querySelector('#ht-login-email');
      expect(emailInput.getAttribute('aria-required')).toBe('true');
    });

    it('should have role="alert" on error container', async () => {
      mockAuthService.signInWithEmail.and.rejectWith({ message: 'Error' });
      setupComponent({ email: true });

      component.email.set('test@example.com');
      component.password.set('wrong');

      const form = fixture.nativeElement.querySelector('.ht-login__email-form');
      form.dispatchEvent(new Event('submit'));
      await fixture.whenStable();
      fixture.detectChanges();

      const errorContainer = fixture.nativeElement.querySelector('.ht-login__error-container');
      expect(errorContainer.getAttribute('role')).toBe('alert');
    });
  });

  describe('empty authOptions', () => {
    it('should render empty state when no providers enabled', () => {
      setupComponent({});
      const ssoButtons = fixture.nativeElement.querySelectorAll('.ht-login__sso-btn');
      const emailForm = fixture.nativeElement.querySelector('.ht-login__email-form');
      expect(ssoButtons.length).toBe(0);
      expect(emailForm).toBeFalsy();
    });
  });
});
