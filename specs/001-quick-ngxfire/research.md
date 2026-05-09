# Research: ht-quick-ngxfire

## R1: @angular/fire Version Compatibility

**Decision**: Use `@angular/fire@next` (21.0.0-rc.0) for Angular 21.
**Rationale**: No stable v21 exists. The RC is the only version with `@angular/core ^21.0.0` peer deps. It depends on `firebase ^12.4.0`.
**Alternatives**: Use `@angular/fire@20.0.1` with `--legacy-peer-deps`, but this pins to `firebase ^11.8.0` and may have runtime issues.

## R2: Firebase Auth API for Custom Login

**Decision**: Use `signInWithPopup()` as default, `signInWithRedirect()` as configurable fallback.
**Rationale**: `signInWithPopup()` avoids third-party cookie/storage issues that affect `signInWithRedirect()` in modern browsers. Both are zone-wrapped by `@angular/fire/auth`.
**Alternatives**: `signInWithRedirect()` only — rejected because of browser-specific storage access issues.

### Available Providers (all from `@angular/fire/auth`)

| Provider | Class |
|---|---|
| Google | `GoogleAuthProvider` |
| Facebook | `FacebookAuthProvider` |
| Twitter/X | `TwitterAuthProvider` |
| GitHub | `GithubAuthProvider` |
| Microsoft | `OAuthProvider('microsoft.com')` |
| Apple | `OAuthProvider('apple.com')` |
| Email/Password | `signInWithEmailAndPassword()` / `createUserWithEmailAndPassword()` |

## R3: Signal-Based Auth State

**Decision**: Use `toSignal(authState(auth), { initialValue: null })` for `Signal<User | null>`.
**Rationale**: `authState()` returns `Observable<User | null>` (zone-wrapped). `toSignal()` from `@angular/core/rxjs-interop` converts it. Must be called in injection context.
**Alternatives**: `user()` from rxfire — waits for `getIdTokenResult()` resolution, slightly slower.

## R4: Breaking Changes (v19 → v21)

| Change | Impact | Migration |
|---|---|---|
| Injection context required | All @angular/fire APIs must be called in injection context | Use field initializers or `runInInjectionContext()` |
| `firebase ^12.4.0` | Major version bump from v11 | Update `package.json` |
| `vertexai` entry point dropped | No longer available | N/A (not used) |
| Provider functions unchanged | `provideFirebaseApp()`, `provideAuth()`, etc. same API | No changes needed |
| rxfire functions unchanged | `collectionData()`, `docData()`, etc. same API | No changes needed |

## R5: FirebaseUI Incompatibility — Confirmed

**Decision**: Remove `firebaseui` dependency entirely.
**Rationale**: `firebaseui` 6.1.0 (last published 2023-08-02) requires `firebase ^9 || ^10`. It does NOT support Firebase v11 or v12. Uses namespaced API, not modular. No updates in 2.5+ years.
**Alternatives**: `ngx-auth-firebaseui` — also depends on FirebaseUI, same compatibility problem.

## R6: Existing Code Issues Found

| File | Issue | Fix |
|---|---|---|
| All services | Excessive `console.log` debug statements | Remove all |
| `ht-auth-ui.service.ts` | Depends on `firebaseui` | Replace with `HtAuthService` |
| `ht-auth-ui.component.ts` | Depends on `firebaseui` | Replace with `HtLoginComponent` |
| `ht-auth-redirect.guard.ts` | Depends on `HtAuthUIService` | Switch to `HtAuthService` |
| `ht-auth-admin.service.ts` | `getUsersByRole()` fetches ALL users instead of filtering | Add `where('role', '==', role)` query |
| `ht-auth-admin.service.ts` | `getUserRoleAsync()` uses manual subscribe pattern | Use `firstValueFrom()` |
| `ht-auth-user-sync.service.ts` | `syncUserToFirestore()` uses manual subscribe pattern | Use `firstValueFrom()` |
| `ht-quick-firestore.service.ts` | `any` types in `addDoc`, `updateDoc`, `setDoc`, `runTransaction` | Tighten to `Record<string, unknown>` or generics |
| `firebase-config.model.ts` | Missing `microsoft`, `apple`, `preferRedirect` options | Add to `AuthOptions` |
| `package.json` (library) | Lists `firebaseui` as dependency | Remove |
| `ng-package.json` | Lists `firebaseui` in `allowedNonPeerDependencies` | Remove |
