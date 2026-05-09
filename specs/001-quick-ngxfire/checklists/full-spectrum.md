# Full-Spectrum Requirements Quality Checklist: ht-quick-ngxfire

**Purpose**: Deep requirements quality validation across all domains (auth, Firestore, Storage, config) for peer review
**Created**: 2026-03-01
**Feature**: [spec.md](../spec.md)
**Depth**: Deep (30-40 items) | **Audience**: Peer reviewer | **Scope**: Full-spectrum

## Requirement Completeness

- [x] CHK001 Are all seven SSO providers in FR-AUTH-01 given equal specification depth (error handling, token exchange, display name)? [Completeness, Spec §FR-AUTH-01] — PASS: All providers are pass-through to Firebase SDK; error handling is identical. Provider table gives equal depth.
- [x] CHK002 Are requirements for the `createAccount()` flow specified beyond field names — e.g., minimum password length, validation rules, or delegation to Firebase defaults? [Completeness, Spec §FR-AUTH-03] — PASS: Updated FR-AUTH-03 now explicitly states "Password validation is delegated to Firebase defaults (minimum 6 characters)."
- [x] CHK003 Is the `isNewUser` field in `AuthResult` defined with clear population rules — when is it `true` vs `false` vs `undefined`? [Completeness, Spec §5 AuthResult] — PASS: Updated data model comment documents: "true when created via createAccount(); derived from UserCredential.additionalUserInfo.isNewUser for SSO."
- [x] CHK004 Are requirements for `HtAuthUserSyncService` dependency on auth state source explicitly stated — does it currently use `HtAuthUIService`, and is the migration to `HtAuthService` specified? [Completeness, Spec §FR-AUTH-11] — PASS: Source code confirms sync service uses `Auth` directly (not `HtAuthUIService`). FR-AUTH-11's "if it currently depends on the latter" is accurate — no migration needed.
- [x] CHK005 Are loading state requirements specified — spinner, disabled buttons, overlay, or skeleton? What UI element indicates "loading"? [Completeness, Spec §FR-AUTH-05] — PASS: Updated FR-AUTH-05 now specifies: "all buttons and form inputs MUST be disabled; a loading indicator (CSS-animatable element) MUST be visible."
- [x] CHK006 Are requirements defined for what happens when `signOut()` is called while no user is signed in? [Gap, Edge Case] — PASS: Firebase's `signOut()` is a no-op when no user is signed in. Library wraps Firebase directly. No special handling needed.
- [x] CHK007 Are the existing `HtStorageService` methods enumerated so "retained as-is" can be verified against a known baseline? [Completeness, Spec §FR-STOR-01] — PASS: The contract file (`component-api.ts`) does not enumerate Storage methods, but FR-STOR-01 + the existing source code form the baseline. "Retained as-is" means the existing public API is the baseline.

## Requirement Clarity

- [x] CHK008 Is "fully stylable via CSS custom properties" quantified — which specific custom properties must be exposed (e.g., `--ht-login-bg`, `--ht-login-btn-color`)? [Clarity, Spec §FR-AUTH-06] — PASS: Updated FR-AUTH-06 now lists required custom property categories: primary action, secondary action, error, background, text, border-radius, font-family, spacing. Naming convention: `--ht-login-*`.
- [x] CHK009 Is "loading state during authentication" defined with measurable criteria — when does it start, when does it end, what visual indicator is required? [Clarity, Spec §FR-AUTH-05] — PASS: Updated FR-AUTH-05 now specifies: "Loading starts when a sign-in/sign-up action is triggered and ends when the auth promise resolves or rejects."
- [x] CHK010 Is "fix only errors, deprecations, or strict-mode violations" for Firestore/Storage defined with a clear boundary — who determines what constitutes an "error" vs. a "code smell"? [Clarity, Spec §FR-FS-01, §FR-STOR-01] — PASS: FR-FS-01 lists four objective criteria (compilation errors, deprecated APIs, console.log removal, strict-mode `any` flags). All are tooling-detectable, not subjective.
- [x] CHK011 Is the `preferRedirect` flag's interaction with email/password auth clarified — does it apply only to SSO, or does it affect all auth methods? [Clarity, Spec §FR-AUTH-02] — PASS: FR-AUTH-02 clearly states "SSO providers MUST use signInWithPopup() by default." Email auth uses `signInWithEmailAndPassword()` which has no popup/redirect concept.
- [x] CHK012 Is "focus management: move focus to error message on auth failure" specific enough — does it mean the error container, the first error text, or the first actionable element? [Clarity, Spec §FR-AUTH-14] — PASS: Updated FR-AUTH-14 now specifies "move focus to the error message container."
- [x] CHK013 Are "semantic tokens" for color contrast delegation defined or listed, or is this left entirely to consumers? [Clarity, Spec §FR-AUTH-14] — PASS: Updated FR-AUTH-14 references `--ht-login-*` tokens (matching FR-AUTH-06). Consumer provides colors; library provides token hooks.

## Requirement Consistency

- [x] CHK014 Does `HtAuthService.signInWithProvider()` signature (`providerId: string, preferRedirect?: boolean`) in the contract match the spec's "consumer sets `preferRedirect` in `AuthOptions`" — are both per-call and per-config override paths intentional? [Consistency, Spec §FR-AUTH-02 vs contracts/component-api.ts] — PASS: Updated spec §FR-AUTH-07 now matches contract: `signInWithProvider(providerId: string, preferRedirect?: boolean)` with note "per-call override; defaults to AuthOptions.preferRedirect."
- [x] CHK015 Are `HtAuthService` method signatures in spec §FR-AUTH-07 consistent with the contract in `component-api.ts` and quickstart examples? [Consistency, Spec §FR-AUTH-07 vs contracts vs quickstart] — PASS: All three artifacts now aligned. Quickstart uses `signInWithProvider('google.com')` (omitting optional param) which is valid.
- [x] CHK016 Is the `AuthResult.error` shape (`{ code: string; message: string }`) consistent with Firebase's actual error structure, or does the spec need to document a mapping? [Consistency, Spec §5 vs Firebase SDK] — PASS: Firebase's `FirebaseError` has `code` and `message` properties. The spec's shape matches directly. Updated FR-AUTH-05 confirms "Firebase error messages are displayed as-is."
- [x] CHK017 Does the "No changes unless build/test errors are found" rule for `HtAuthAdminService` (§FR-AUTH-09) conflict with the Phase 2 cleanup tasks that remove console.logs and fix `any` types? [Consistency, Spec §FR-AUTH-09 vs tasks T009-T011] — PASS: Updated FR-AUTH-09 now states "No functional changes. Cleanup changes per NFR-06 and NFR-07 apply. Bug fixes in scope."
- [x] CHK018 Is the `UserProfile.metadata` type (`Record<string, unknown>`) consistent across spec §5, data-model.md, and contract file? [Consistency, cross-artifact] — PASS: All three artifacts use `Record<string, unknown>`.

## Acceptance Criteria Quality

- [x] CHK019 Can US1 acceptance criterion "Loading and error states are visible to the user" be objectively measured without further definition of what "visible" means? [Measurability, Spec §US1] — PASS: Updated US1 AC now reads "Loading state disables all interactive elements; error state displays message and receives focus" — objectively testable.
- [x] CHK020 Can US3 acceptance criterion "No deprecated API warnings at build time" be objectively verified — does the build actually emit deprecation warnings, or are they suppressed? [Measurability, Spec §US3] — PASS: `ng build` emits warnings visibly in console output. Build gate (NFR-04) ensures zero errors; warnings are visible and verifiable.
- [x] CHK021 Can US4 acceptance criterion "Upload progress tracking works correctly" be verified without a defined expected behavior (percentage accuracy, update frequency)? [Measurability, Spec §US4] — PASS: "Works correctly" means the existing behavior is preserved (FR-STOR-01: "retained as-is"). The acceptance criterion verifies no regression, not new behavior.
- [x] CHK022 Are US2 acceptance criteria testable in isolation — can `htAuthRedirectGuard` be tested without a running Firebase project? [Measurability, Spec §US2] — PASS: Guards inject `HtAuthService` which can be mocked in tests. No live Firebase project required for unit testing.

## Scenario Coverage

- [x] CHK023 Are requirements defined for concurrent sign-in attempts (user clicks Google SSO while email sign-in is in progress)? [Coverage, Gap] — PASS: New FR-AUTH-16 specifies "all sign-in buttons and form submission MUST be disabled" during loading state, preventing concurrent attempts.
- [x] CHK024 Are requirements defined for the auth state when the Firebase project is unreachable (network failure during sign-in)? [Coverage, Exception Flow] — PASS: New FR-AUTH-16 states "Network errors from Firebase are surfaced through the standard error display (FR-AUTH-05)." Firebase SDK handles network errors as rejections.
- [x] CHK025 Are requirements specified for the transition between email form modes (sign-in → sign-up → password-reset) — is form state (entered email) preserved across mode switches? [Coverage, Spec §FR-AUTH-03] — PASS: Updated FR-AUTH-03 now states "Email field MUST be preserved when switching between modes."
- [x] CHK026 Are requirements defined for what `HtLoginComponent` renders when `authOptions` has all flags set to `false` (no providers enabled)? [Coverage, Edge Case] — PASS: New FR-AUTH-15 specifies "the component MUST render an empty state (no buttons, no form) rather than throwing."
- [x] CHK027 Is the behavior specified when `signInWithProvider()` is called with an unrecognized `providerId` string? [Coverage, Edge Case] — PASS: Firebase SDK throws `auth/invalid-provider-id` error. This is surfaced via standard error handling (FR-AUTH-05). No special handling needed — library wraps Firebase directly.

## Edge Case & Error Handling Coverage

- [x] CHK028 Are requirements defined for handling Firebase auth errors with user-facing messages — is there a mapping from Firebase error codes to display text, or raw codes shown? [Edge Case, Gap] — PASS: Updated FR-AUTH-05 states "Firebase error messages are displayed as-is (no custom mapping — Firebase provides user-readable messages)."
- [x] CHK029 Are requirements specified for the confirm-password field in sign-up mode — what happens when passwords don't match? [Edge Case, Spec §FR-AUTH-03] — PASS: Updated FR-AUTH-03 sign-up mode now states "Confirm-password mismatch MUST show inline validation error before submission."
- [x] CHK030 Are requirements defined for the email field validation — is it HTML5 email validation, Firebase-side only, or a specific regex? [Edge Case, Gap] — PASS: Updated FR-AUTH-03 states "Email validation uses native HTML5 type='email' — server-side validation is handled by Firebase."
- [x] CHK031 Are requirements specified for `sendPasswordReset()` when the email is not registered — does it succeed silently (Firebase default) or show an error? [Edge Case, Spec §FR-AUTH-03] — PASS: Firebase's `sendPasswordResetEmail()` succeeds silently by design (security: doesn't reveal registration status). The success/error display in FR-AUTH-03 handles both outcomes.

## Non-Functional Requirements Coverage

- [x] CHK032 Are bundle size requirements or constraints specified for the library after removing `firebaseui`? [NFR, Gap] — PASS: No specific bundle size constraint needed for an internal library. Removing `firebaseui` (~200KB) is inherently a size reduction. Bundle size optimization is out of scope (§7).
- [x] CHK033 Is the `HtQuickNgxFireError` custom error class's usage pattern specified — which error conditions must use it vs. re-throwing Firebase errors? [NFR, Spec §NFR-06] — PASS: NFR-06 states "Use the custom HtQuickNgxFireError for error conditions." Firebase auth errors are re-thrown from promises; `HtQuickNgxFireError` is for library-internal error conditions (misconfiguration, missing dependencies).
- [x] CHK034 Are the "zero errors" build gate (NFR-04) and "zero `any` types" (NFR-07) requirements reconciled with AngularFire's own loosely-typed APIs — is there a documented exception list? [NFR, Spec §NFR-04 vs §NFR-07] — PASS: Updated NFR-07 now documents: "except where required by AngularFire's own typings (e.g., FirestoreDataConverter<T, any>, runTransaction callback). Such exceptions MUST be documented with an inline comment."
- [x] CHK035 Are test coverage expectations quantified — "must have unit tests" (NFR-05) does not specify coverage threshold or required scenarios per service/component? [NFR, Spec §NFR-05] — PASS: NFR-05 requires "new components/services MUST have unit tests." Tasks T022-T023 enumerate specific test scenarios. No numerical coverage threshold is needed for an internal library — test existence is the gate.

## Dependencies & Assumptions

- [x] CHK036 Is the assumption that `@angular/fire` ^21.0.0 stable release will exist before implementation documented as a risk — currently only 21.0.0-rc.0 is available? [Assumption, research.md §R1] — PASS: Documented in research.md §R1. The decision is to use `@angular/fire@next` (RC). Risk accepted.
- [x] CHK037 Are requirements for the `provideHtQuickNgxFire` provider function's handling of the new `microsoft`/`apple`/`preferRedirect` options specified beyond "add them"? [Dependency, Spec §FR-CFG-01] — PASS: FR-CFG-01 says "add microsoft and apple to AuthOptions." FR-CFG-02 shows the full updated interface. The provider function passes config through — no special handling logic needed beyond type updates.
- [x] CHK038 Is the dependency between `HtLoginComponent` and `HtAuthService` explicitly documented — does the component inject the service, or does it accept auth functions via input? [Dependency, Gap] — PASS: New FR-AUTH-15 states "HtLoginComponent MUST inject HtAuthService internally. Consumers do not pass auth functions via input."

## Migration & Breaking Changes

- [x] CHK039 Are migration requirements from `HtAuthUIService` → `HtAuthService` specified for consumers who subclassed or extended the old service? [Coverage, Spec §6] — PASS: Updated §6 now states: "Consumers who subclassed these must migrate to HtAuthService / HtLoginComponent which are final (not designed for subclassing — use composition via HtAuthService injection)."
- [x] CHK040 Is the removal of `isPendingRedirect()` in the redirect guard documented as a behavioral change that consumers need to be aware of? [Completeness, Spec §FR-AUTH-12] — PASS: Updated §6 migration table now includes `htAuthRedirectGuard` with note "No longer calls isPendingRedirect() — behavioral change for redirect-flow users."

## Notes

- This checklist tests the **quality of the requirements**, not the implementation
- All 40 items reviewed and resolved on 2026-03-01
- Spec updates applied: FR-AUTH-03 (validation, mode transitions), FR-AUTH-05 (loading/error detail), FR-AUTH-06 (CSS properties), FR-AUTH-09 (cleanup scope), FR-AUTH-14 (focus target), FR-AUTH-15 (new: component-service dep, empty state), FR-AUTH-16 (new: concurrent prevention, network errors), NFR-07 (AngularFire exceptions), US1 AC (measurable), §5 AuthResult (isNewUser rules), §6 (migration details)
