# Implementation Plan: ht-quick-ngxfire

**Branch**: `001-quick-ngxfire` | **Date**: 2026-02-28 | **Spec**: `specs/001-quick-ngxfire/spec.md`

## Summary

Replace FirebaseUI-based authentication with custom Angular components and a headless auth service. Clean up existing Firestore, Storage, and Admin services (remove debug logging, fix `any` types, update deprecated APIs). Remove the `firebaseui` dependency entirely. The library targets Angular 21 with `@angular/fire` ^21.0.0 and `firebase` ^12.4.0.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict) / Angular 21
**Primary Dependencies**: `@angular/fire` ^21.0.0 (bundled), `firebase` ^12.4.0 (transitive)
**Storage**: Cloud Firestore (via `@angular/fire/firestore`), Cloud Storage (via `@angular/fire/storage`)
**Testing**: Jasmine + Karma (workspace default)
**Target Platform**: Web (Angular library consumed by Angular 21+ apps)
**Project Type**: Angular library (`ng-packagr`)
**Constraints**: No FirebaseUI. Library must be independently buildable and testable.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Library-First Architecture | PASS | Feature is a standalone library in `projects/ht-quick-ngxfire/` |
| II. Modern Angular Patterns | PASS | All new code uses `inject()`, `signal()`, `input()`/`output()`, `@if`/`@for`, `OnPush` |
| III. Minimal & Stable Public API | PASS | `HtAuthUIService`/`HtAuthUIComponent` removed (breaking), replaced by `HtAuthService`/`HtLoginComponent`. Migration documented in spec §6. `firebaseui` removed from `allowedNonPeerDependencies`. |
| IV. Build & Test Gate | PASS | `ng build ht-quick-ngxfire` and `ng test ht-quick-ngxfire` required after each phase |
| V. DRY, YAGNI & KISS | PASS | No speculative features. Only auth replacement + cleanup of existing code. |
| Angular Coding Standards | PASS | Roles on `users/{uid}` (not subcollections). Relative imports within library. |

**Post-Phase-1 Re-check**: Constitution alignment confirmed. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-quick-ngxfire/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 research findings
├── data-model.md        # Data model definitions
├── quickstart.md        # Consumer quickstart guide
├── contracts/
│   └── component-api.ts # Public API contracts
└── checklists/
    └── requirements.md  # Requirements checklist
```

### Source Code

```text
projects/ht-quick-ngxfire/src/
├── public-api.ts                              # Barrel exports (updated)
├── lib/
│   ├── ht-quick-ngxfire.providers.ts         # Provider factory (updated)
│   ├── firebase-config.model.ts               # Config interfaces (updated: AuthOptions)
│   ├── ht-quick-ngxfire.error.ts              # Custom error class (unchanged)
│   ├── auth/
│   │   ├── ht-auth.service.ts                 # NEW — replaces ht-auth-ui.service.ts
│   │   ├── ht-auth.service.spec.ts            # NEW — tests
│   │   ├── ht-login.component.ts              # NEW — replaces ht-auth-ui.component.ts
│   │   ├── ht-login.component.spec.ts         # NEW — tests
│   │   ├── auth-result.model.ts               # NEW — AuthResult interface
│   │   ├── ht-auth-admin.service.ts           # Cleanup only (console.log, any types, getUsersByRole bug)
│   │   ├── ht-auth-user-sync.service.ts       # Cleanup only (console.log, subscribe→firstValueFrom)
│   │   ├── ht-role.guard.ts                   # Cleanup only (console.log)
│   │   ├── ht-auth-redirect.guard.ts          # Updated to use HtAuthService
│   │   ├── ht-auth-ui.service.ts              # DELETED
│   │   └── ht-auth-ui.component.ts            # DELETED
│   ├── firestore/
│   │   ├── ht-quick-firestore.service.ts      # Cleanup only (console.log, any→unknown)
│   │   ├── ht-quick-firestore.service.spec.ts # Unchanged (fix if tests break)
│   │   └── batch-operations.model.ts          # Unchanged
│   └── storage/
│       └── ht-storage.service.ts              # Cleanup only (console.log, any→unknown)
├── ng-package.json                            # Remove firebaseui from allowedNonPeerDependencies
└── package.json                               # Remove firebaseui dependency
```

## Implementation Phases

### Phase 1: Cleanup & Dependency Removal

Remove `firebaseui` and clean up all existing services. No new features.

1. Remove `firebaseui` from `package.json` dependencies
2. Remove `firebaseui` from `ng-package.json` `allowedNonPeerDependencies`
3. Remove `console.log`/`console.warn` debug statements from all services
4. Fix `any` types in `HtFirestoreService` (`addDoc`, `updateDoc`, `setDoc`, `runTransaction`)
5. Fix `any` types in `HtAuthAdminService` (`UserProfile.metadata` → `Record<string, unknown>`)
6. Fix `getUsersByRole()` in admin service — add `where('role', '==', role)` query filter
7. Fix `getUserRoleAsync()` — replace manual subscribe with `firstValueFrom()`
8. Fix `HtAuthUserSyncService.syncUserToFirestore()` — replace manual subscribe with `firstValueFrom()`
9. Update `AuthOptions` in `firebase-config.model.ts` — add `microsoft`, `apple`, `preferRedirect`
10. Remove `console.log` from `provideHtQuickNgxFire`

**Gate**: `ng build ht-quick-ngxfire` passes (will fail until Phase 2 replaces deleted files)

### Phase 2: New Auth Service & Component

Replace FirebaseUI-dependent code with custom implementations.

1. Create `auth-result.model.ts` with `AuthResult` interface
2. Create `HtAuthService` (`ht-auth.service.ts`):
   - `user$` via `authState(auth)` from `@angular/fire/auth`
   - `currentUser` via `toSignal(this.user$, { initialValue: null })`
   - `signInWithProvider()` using `signInWithPopup()` / `signInWithRedirect()`
   - `signInWithEmail()` using `signInWithEmailAndPassword()`
   - `createAccount()` using `createUserWithEmailAndPassword()`
   - `signOut()` / `sendPasswordReset()`
3. Create `HtLoginComponent` (`ht-login.component.ts`):
   - `authOptions = input.required<AuthOptions>()`
   - `authResult = output<AuthResult>()`
   - SSO buttons rendered via `@for` over enabled providers
   - Email/password form with sign-in/sign-up toggle
   - Loading spinner and error message display
   - CSS custom properties for consumer styling
4. Delete `ht-auth-ui.service.ts`
5. Delete `ht-auth-ui.component.ts`
6. Update `ht-auth-redirect.guard.ts` to inject `HtAuthService` instead of `HtAuthUIService`
7. Update `public-api.ts` barrel exports:
   - Remove `HtAuthUIService`, `HtAuthUIComponent`
   - Add `HtAuthService`, `HtLoginComponent`, `AuthResult`

**Gate**: `ng build ht-quick-ngxfire` passes with zero errors

### Phase 3: Tests

1. Write `ht-auth.service.spec.ts`:
   - Mock `Auth` from `@angular/fire/auth`
   - Test `signInWithProvider()`, `signInWithEmail()`, `createAccount()`, `signOut()`, `sendPasswordReset()`
   - Test `currentUser` signal updates on auth state change
2. Write `ht-login.component.spec.ts`:
   - Test SSO buttons render based on `authOptions` input
   - Test email form renders when `email: true`
   - Test `authResult` output emits on successful sign-in
   - Test loading and error states
3. Verify existing `ht-quick-firestore.service.spec.ts` still passes
4. Fix any test failures from Phase 1/2 changes

**Gate**: `ng test ht-quick-ngxfire` passes. `ng build ht-quick-ngxfire` still passes.

### Phase 4: Polish

1. Final review of `public-api.ts` exports — ensure no `firebaseui` references remain
2. Verify `ng build ht-quick-ngxfire` produces clean output with no warnings
3. Update `ht-software` showcase app's ngxfire demo to use `HtLoginComponent` instead of `HtAuthUIComponent`

**Gate**: Full build and test pass. Showcase app compiles.

## Complexity Tracking

No constitution violations requiring justification. The `firebaseui` removal is a breaking public API change, documented in spec §6 with migration guidance.
