import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot } from '@angular/router';
import { htAuthRedirectGuard } from './ht-auth-redirect.guard';
import { HtAuthService } from './ht-auth.service';
import { signal, WritableSignal } from '@angular/core';
import { User } from '@angular/fire/auth';

describe('htAuthRedirectGuard', () => {
  let mockRouter: jasmine.SpyObj<Router>;
  let currentUserSignal: WritableSignal<User | null>;
  let mockRoute: ActivatedRouteSnapshot;

  beforeEach(() => {
    currentUserSignal = signal<User | null>(null);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: HtAuthService,
          useValue: { currentUser: currentUserSignal },
        },
        { provide: Router, useValue: mockRouter },
      ],
    });

    mockRoute = { data: {} } as unknown as ActivatedRouteSnapshot;
  });

  it('should allow access when user is authenticated', () => {
    currentUserSignal.set({ uid: 'test-uid' } as User);
    const result = TestBed.runInInjectionContext(() => htAuthRedirectGuard(mockRoute, {} as any));
    expect(result).toBeTrue();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should redirect to "/" when user is not authenticated', () => {
    currentUserSignal.set(null);
    const result = TestBed.runInInjectionContext(() => htAuthRedirectGuard(mockRoute, {} as any));
    expect(result).toBeFalse();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should redirect to custom path from route data', () => {
    currentUserSignal.set(null);
    mockRoute = { data: { redirectTo: '/login' } } as unknown as ActivatedRouteSnapshot;
    const result = TestBed.runInInjectionContext(() => htAuthRedirectGuard(mockRoute, {} as any));
    expect(result).toBeFalse();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });
});
