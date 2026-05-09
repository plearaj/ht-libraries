# `ht-quick-ngxfire` Specification

## 1. Overview

`ht-quick-ngxfire` is an Angular 21 library that simplifies Firebase integration by providing services, components, and guards that abstract the `@angular/fire` SDK. The library covers three domains: **Authentication**, **Firestore**, and **Storage**.

**Key design decision**: The library uses **custom-built Angular components** for authentication UI — not FirebaseUI (`firebaseui` npm package). FirebaseUI historically lags behind Angular, AngularFire, and Firebase releases, causing version conflicts and breaking changes. Custom components give full control over compatibility, styling, and behavior.

### Technology Stack

| Dependency | Version | Bundled? |
|---|---|---|
| Angular | ^21.0.0 | peerDependency |
| `@angular/fire` | ^21.0.0 | bundled (allowedNonPeerDependency) |
| RxJS | ~7.8.0 | peerDependency |
| TypeScript | ~5.9.0 (strict) | devDependency |

**Removed dependency**: `firebaseui` (^6.1.0) — replaced by custom auth components.

## 2. Functional Requirements

### 2.1. Authentication — Custom Login Component (`HtLoginComponent`)

**FR-AUTH-01**: The login component MUST support the following sign-in methods, each togglable via `AuthOptions` configuration:

| Method | Provider | Config Flag |
|---|---|---|
| Google | `GoogleAuthProvider` | `google: true` |
| Facebook | `FacebookAuthProvider` | `facebook: true` |
| Twitter/X | `TwitterAuthProvider` | `twitter: true` |
| GitHub | `GithubAuthProvider` | `github: true` |
| Microsoft | `OAuthProvider('microsoft.com')` | `microsoft: true` |
| Apple | `OAuthProvider('apple.com')` | `apple: true` |
| Email/Password | `EmailAuthProvider` | `email: true` |

**FR-AUTH-02**: SSO providers MUST use `signInWithPopup()` by default. Consumers who need redirect-based auth (e.g., mobile browsers that block popups) MUST set `preferRedirect: true` in `AuthOptions`. There is no automatic popup-block detection or runtime fallback — the mode is configuration-only.

**FR-AUTH-03**: Email/password sign-in MUST provide three modes:
- **Sign-in** (default): email + password fields, "Forgot password?" link, "Create account" link
- **Sign-up**: email + password + confirm password fields, "Already have an account?" link. Confirm-password mismatch MUST show inline validation error before submission. Password validation is delegated to Firebase defaults (minimum 6 characters).
- **Password reset** (inline): email field + "Send reset link" button + "Back to sign-in" link. Calls `sendPasswordResetEmail()` and displays success/error inline.

Email field MUST be preserved when switching between modes. Email validation uses native HTML5 `type="email"` — server-side validation is handled by Firebase.

**FR-AUTH-16**: The component MUST prevent concurrent sign-in attempts — while an auth operation is in progress (loading state), all sign-in buttons and form submission MUST be disabled. Network errors from Firebase are surfaced through the standard error display (FR-AUTH-05).

**FR-AUTH-04**: The component MUST emit authentication results via an `output()` signal so the consumer can react (navigate, show errors, etc.).

**FR-AUTH-05**: The component MUST display loading state during authentication and error messages on failure. Loading state: all buttons and form inputs MUST be disabled; a loading indicator (CSS-animatable element) MUST be visible. Loading starts when a sign-in/sign-up action is triggered and ends when the auth promise resolves or rejects. On auth failure, password fields MUST be cleared (security: reduce credential exposure in DOM); the email field MUST be preserved. Firebase error messages are displayed as-is (no custom mapping — Firebase provides user-readable messages).

**FR-AUTH-06**: The component MUST be stylable by consumers via CSS custom properties. The component MUST expose custom properties for: primary action color, secondary action color, error color, background, text color, border-radius, font-family, and spacing. Property naming convention: `--ht-login-*` (e.g., `--ht-login-primary`, `--ht-login-error`, `--ht-login-bg`). All visual properties MUST have sensible defaults.

**FR-AUTH-15**: `HtLoginComponent` MUST inject `HtAuthService` internally. Consumers do not pass auth functions via input — the component handles all auth calls through the service. When `authOptions` has no enabled providers (all flags `false` or `undefined`), the component MUST render an empty state (no buttons, no form) rather than throwing.

**FR-AUTH-14**: The login component MUST meet WCAG 2.1 AA baseline accessibility:
- All interactive elements MUST have ARIA labels
- Full keyboard navigation (tab order, Enter to submit forms)
- Focus management: move focus to the error message container on auth failure
- Sufficient color contrast delegated to consumer via CSS custom properties (library provides `--ht-login-*` tokens, not hardcoded colors)

### 2.2. Authentication — Auth Service (`HtAuthService`)

**FR-AUTH-07**: Replace `HtAuthUIService` with `HtAuthService` that provides:
- `user$: Observable<User | null>` — current auth state stream
- `currentUser: Signal<User | null>` — signal-based current user (from `toSignal()`)
- `signInWithProvider(providerId: string, preferRedirect?: boolean): Promise<UserCredential>` — SSO sign-in (per-call override; defaults to `AuthOptions.preferRedirect`)
- `signInWithEmail(email, password): Promise<UserCredential>` — email sign-in
- `createAccount(email, password): Promise<UserCredential>` — email sign-up
- `signOut(): Promise<void>`
- `sendPasswordReset(email): Promise<void>`

**FR-AUTH-08**: `HtAuthService` MUST NOT depend on `firebaseui` in any way.

### 2.3. Authentication — Admin Service (`HtAuthAdminService`)

**FR-AUTH-09**: The existing admin service is retained as-is. It handles:
- User invitation (`inviteUserByEmail`)
- Role management (assign, get, remove roles)
- Permission management (add, remove, check permissions)
- User profile CRUD
- Batch role assignment

No functional changes. Cleanup changes per NFR-06 (remove `console.log`) and NFR-07 (fix `any` types) apply to all services including this one. Bug fixes (e.g., `getUsersByRole()` missing query filter) are in scope.

### 2.4. Authentication — User Sync Service (`HtAuthUserSyncService`)

**FR-AUTH-10**: The existing user sync service is retained. It auto-syncs authenticated users to Firestore with default role/permissions on first login.

**FR-AUTH-11**: The sync service MUST be updated to use `HtAuthService` instead of `HtAuthUIService` for auth state, if it currently depends on the latter.

### 2.5. Authentication — Route Guards

**FR-AUTH-12**: `htAuthRedirectGuard` MUST be updated to use `HtAuthService` instead of `HtAuthUIService`. The `isPendingRedirect()` check is no longer needed when using popup-based SSO (remove FirebaseUI-specific logic).

**FR-AUTH-13**: `htRoleGuard`, `createRoleGuard()`, and `htAdminGuard` are retained as-is. No changes unless build errors are found.

### 2.6. Firestore (`HtFirestoreService`)

**FR-FS-01**: The Firestore service is retained as-is. Changes are limited to:
- Fixing compilation errors against `@angular/fire` ^21.0.0
- Replacing deprecated APIs with their current equivalents
- Removing `console.log` debug statements from production code
- Fixing `any` types where TypeScript strict mode flags them

**FR-FS-02**: The existing public API (method signatures, return types) MUST NOT change. Consumers should not need to update their code.

### 2.7. Storage (`HtStorageService`)

**FR-STOR-01**: The storage service is retained as-is. Same rules as Firestore — fix only errors, deprecations, or strict-mode violations.

### 2.8. Configuration (`provideHtQuickNgxFire`)

**FR-CFG-01**: The provider function MUST be updated to:
- Remove `console.log` debug statements
- Add `microsoft` and `apple` to `AuthOptions`

**FR-CFG-02**: `AuthOptions` updated interface:
```typescript
interface AuthOptions {
  email?: boolean;
  google?: boolean;
  facebook?: boolean;
  twitter?: boolean;
  github?: boolean;
  microsoft?: boolean;
  apple?: boolean;
  preferRedirect?: boolean; // Use redirect instead of popup for SSO
}
```

## 3. Non-Functional Requirements

**NFR-01**: All components MUST use `ChangeDetectionStrategy.OnPush` and `standalone: true`.

**NFR-02**: All services MUST use `inject()` — constructor injection is forbidden.

**NFR-03**: All templates MUST use `@if`/`@for`/`@switch` control flow — no structural directives.

**NFR-04**: The library MUST build with `ng build ht-quick-ngxfire` with zero errors.

**NFR-05**: All existing tests MUST continue to pass. New components/services MUST have unit tests.

**NFR-06**: `console.log`/`console.warn` debug statements MUST be removed from all production code. Use the custom `HtQuickNgxFireError` for error conditions.

**NFR-07**: TypeScript strict mode MUST be satisfied — no `any` types except where required by AngularFire's own typings (e.g., `FirestoreDataConverter<T, any>`, `runTransaction` callback). Such exceptions MUST be documented with an inline comment explaining the AngularFire constraint.

## 4. User Stories

### US1: Consumer Adds Login to Their App

**As a** consuming app developer,
**I want to** drop `<ht-login>` into my template and configure which providers are enabled,
**so that** I get a working login UI without building auth flows myself.

**Acceptance Criteria:**
- `<ht-login>` renders SSO buttons for each enabled provider
- `<ht-login>` renders email/password form when `email: true`
- Authentication result is emitted via output signal
- Loading state disables all interactive elements; error state displays message and receives focus
- Component works with `OnPush` change detection

### US2: Consumer Protects Routes

**As a** consuming app developer,
**I want to** use `htAuthRedirectGuard` and `htRoleGuard` to protect routes,
**so that** unauthenticated or unauthorized users are redirected.

**Acceptance Criteria:**
- Guards work without FirebaseUI dependency
- `htAuthRedirectGuard` checks `HtAuthService.currentUser` signal
- `htRoleGuard` checks Firestore-backed roles (unchanged behavior)

### US3: Consumer Uses Firestore Service

**As a** consuming app developer,
**I want to** use `HtFirestoreService` for CRUD, queries, transactions, and batch writes,
**so that** I don't interact with raw AngularFire/Firestore APIs.

**Acceptance Criteria:**
- All existing methods work with `@angular/fire` ^21.0.0
- No deprecated API warnings at build time
- No `any` types leak into the public API

### US4: Consumer Uses Storage Service

**As a** consuming app developer,
**I want to** use `HtStorageService` for file uploads, downloads, and metadata management,
**so that** I don't interact with raw Firebase Storage APIs.

**Acceptance Criteria:**
- All existing methods work with `@angular/fire` ^21.0.0
- Upload progress tracking works correctly
- No deprecated API warnings

## 5. Data Models

### `FirebaseConfig` (updated)
```typescript
interface FirebaseConfig {
  authOptions: AuthOptions;
  firebaseOptions: FirebaseOptions;
  firestore: boolean;
  database: boolean;
  functions: boolean;
  storage: boolean;
}
```

### `AuthOptions` (updated)
```typescript
interface AuthOptions {
  email?: boolean;
  google?: boolean;
  facebook?: boolean;
  twitter?: boolean;
  github?: boolean;
  microsoft?: boolean;
  apple?: boolean;
  preferRedirect?: boolean; // Use redirect instead of popup for SSO
}
```

### `UserRole` (unchanged)
```typescript
interface UserRole {
  role: string;
  permissions?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}
```

### `UserProfile` (unchanged)
```typescript
interface UserProfile {
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
```

### `AuthResult` (new)
```typescript
interface AuthResult {
  success: boolean;
  user: User | null;
  error?: { code: string; message: string };
  isNewUser?: boolean; // true when created via createAccount(); derived from UserCredential.additionalUserInfo.isNewUser for SSO
}
```

## 6. Public API Changes Summary

| Symbol | Change | Migration |
|---|---|---|
| `HtAuthUIService` | **Removed** | Use `HtAuthService` |
| `HtAuthUIComponent` | **Removed** | Use `HtLoginComponent` |
| `HtAuthService` | **New** | — |
| `HtLoginComponent` | **New** | — |
| `AuthResult` | **New** | — |
| `AuthOptions` | **Updated** | Added `microsoft`, `apple`, `preferRedirect` |
| `firebaseui` dependency | **Removed** | No longer needed |
| `htAuthRedirectGuard` | **Updated** | No longer calls `isPendingRedirect()` — behavioral change for redirect-flow users |
| All other exports | **Unchanged** | — |

**Note**: `HtAuthUIService` and `HtAuthUIComponent` are deleted, not deprecated. Consumers who subclassed these must migrate to `HtAuthService` / `HtLoginComponent` which are `final` (not designed for subclassing — use composition via `HtAuthService` injection).

## Clarifications

### Session 2026-03-01

- Q: When an SSO popup is blocked by the browser, how should the login component handle it? → A: Consumer sets `preferRedirect: true` in config; no runtime fallback.
- Q: What should the initial mode be for the email/password form? → A: Default to sign-in mode; user clicks "Create account" to toggle.
- Q: Should the login component meet any baseline accessibility requirements? → A: WCAG 2.1 AA baseline: ARIA labels, keyboard nav, focus management, contrast via CSS custom properties.
- Q: Should password reset show an inline form or emit an event for the consumer? → A: Inline form (third mode within the component alongside sign-in and sign-up).
- Q: Should the login component clear password fields after a failed auth attempt? → A: Clear password fields on failure; keep email field populated.

## 7. Out of Scope

- Two-factor authentication (2FA)
- JWT client-side management
- Image resizing via Cloud Functions
- File preview components
- Angular schematics
- Offline caching strategies
- Custom theming system (consumers style via CSS custom properties)
