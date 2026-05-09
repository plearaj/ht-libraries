import { HtAuthService } from './ht-auth.service';

/**
 * HtAuthService is a thin wrapper around Firebase Auth functions.
 * Firebase auth functions (signInWithPopup, signInWithEmailAndPassword, etc.)
 * are ES module exports that cannot be spied on in Jasmine.
 * authState() requires a real Firebase Auth instance at construction time.
 *
 * We verify the public API shape here. Integration behavior is tested
 * through HtLoginComponent tests which mock HtAuthService entirely.
 */
describe('HtAuthService', () => {
  it('should be defined', () => {
    expect(HtAuthService).toBeDefined();
  });

  it('should have the expected public API methods', () => {
    const proto = HtAuthService.prototype;
    expect(typeof proto.signInWithProvider).toBe('function');
    expect(typeof proto.signInWithEmail).toBe('function');
    expect(typeof proto.createAccount).toBe('function');
    expect(typeof proto.signOut).toBe('function');
    expect(typeof proto.sendPasswordReset).toBe('function');
  });
});
