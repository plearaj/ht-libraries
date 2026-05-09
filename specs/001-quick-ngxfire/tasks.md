# Tasks: ht-quick-ngxfire

**Input**: Design documents from `/specs/001-quick-ngxfire/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included — spec NFR-05 requires unit tests for new components/services.

**Organization**: Tasks grouped by user story. US1 (Login) is the MVP. US2 (Guards) depends on US1 (needs HtAuthService). US3 (Firestore) and US4 (Storage) are independent cleanup-only stories.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Dependency & Config Cleanup)

**Purpose**: Remove `firebaseui` dependency and update configuration interfaces. No new features.

- [x] T001 Remove `firebaseui` from `projects/ht-quick-ngxfire/package.json` dependencies
- [x] T002 Remove `firebaseui` from `allowedNonPeerDependencies` in `projects/ht-quick-ngxfire/ng-package.json`
- [x] T003 Update `AuthOptions` interface: add `microsoft`, `apple`, `preferRedirect` fields in `projects/ht-quick-ngxfire/src/lib/firebase-config.model.ts`
- [x] T004 Create `AuthResult` interface in `projects/ht-quick-ngxfire/src/lib/auth/auth-result.model.ts`

---

## Phase 2: Foundational (Service Cleanup — Blocking Prerequisites)

**Purpose**: Clean up all existing services to remove debug logging, fix `any` types, and fix bugs. MUST complete before user story work begins (US1 depends on clean Firestore service for admin/sync).

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 Remove all `console.log`/`console.warn` debug statements from `projects/ht-quick-ngxfire/src/lib/ht-quick-ngxfire.providers.ts`
- [x] T006 [P] Remove all `console.log`/`console.warn` debug statements from `projects/ht-quick-ngxfire/src/lib/firestore/ht-quick-firestore.service.ts`
- [x] T007 [P] Fix `any` types in `HtFirestoreService` — replace `any` with `Record<string, unknown>` or generics in `addDoc`, `updateDoc`, `setDoc`, `runTransaction`, `createCollectionRef` in `projects/ht-quick-ngxfire/src/lib/firestore/ht-quick-firestore.service.ts`
- [x] T008 [P] Remove all `console.log`/`console.warn` debug statements from `projects/ht-quick-ngxfire/src/lib/storage/ht-storage.service.ts`
- [x] T009 [P] Remove all `console.log`/`console.warn` debug statements and fix `any` types in `projects/ht-quick-ngxfire/src/lib/auth/ht-auth-admin.service.ts`
- [x] T010 [P] Fix `getUsersByRole()` in `HtAuthAdminService` — add `where('role', '==', role)` query filter instead of fetching all users in `projects/ht-quick-ngxfire/src/lib/auth/ht-auth-admin.service.ts`
- [x] T011 [P] Fix `getUserRoleAsync()` — replace manual subscribe/Promise pattern with `firstValueFrom()` in `projects/ht-quick-ngxfire/src/lib/auth/ht-auth-admin.service.ts`
- [x] T012 [P] Remove all `console.log` debug statements from `projects/ht-quick-ngxfire/src/lib/auth/ht-auth-user-sync.service.ts`
- [x] T013 [P] Fix `syncUserToFirestore()` — replace manual subscribe/Promise pattern with `firstValueFrom()` in `projects/ht-quick-ngxfire/src/lib/auth/ht-auth-user-sync.service.ts`
- [x] T014 [P] Remove `console.log` from `htRoleGuard` and `createRoleGuard` in `projects/ht-quick-ngxfire/src/lib/auth/ht-role.guard.ts`
- [x] T015 Verify existing tests still pass: run `ng test ht-quick-ngxfire --no-watch`

**Checkpoint**: All existing services cleaned up. Build may still fail (old auth files reference `firebaseui`). Tests should still pass.

---

## Phase 3: User Story 1 — Consumer Adds Login to Their App (Priority: P1) MVP

**Goal**: Consumer can drop `<ht-login>` into their template, configure providers, and get a working login UI with SSO + email/password.

**Independent Test**: Render `<ht-login [authOptions]="{google: true, email: true}">` — verify Google button and email form appear, mock auth calls succeed and `authResult` emits.

### Implementation for User Story 1

- [x] T016 [US1] Create `HtAuthService` in `projects/ht-quick-ngxfire/src/lib/auth/ht-auth.service.ts` — implement `user$` (from `authState()`), `currentUser` (from `toSignal()`), `signInWithProvider()`, `signInWithEmail()`, `createAccount()`, `signOut()`, `sendPasswordReset()`
- [x] T017 [US1] Create `HtLoginComponent` in `projects/ht-quick-ngxfire/src/lib/auth/ht-login.component.ts` — standalone, OnPush, `authOptions` input (signal), `authResult` output, SSO buttons via `@for`, email/password form with three modes (sign-in/sign-up/password-reset per FR-AUTH-03), clear password fields on auth failure (FR-AUTH-05), loading/error state display, WCAG 2.1 AA a11y (ARIA labels, keyboard nav, focus management per FR-AUTH-14), CSS custom properties for styling
- [x] T018 [US1] Delete `projects/ht-quick-ngxfire/src/lib/auth/ht-auth-ui.service.ts` (replaced by HtAuthService)
- [x] T019 [US1] Delete `projects/ht-quick-ngxfire/src/lib/auth/ht-auth-ui.component.ts` (replaced by HtLoginComponent)
- [x] T020 [US1] Update `projects/ht-quick-ngxfire/src/public-api.ts` — remove `HtAuthUIService`/`HtAuthUIComponent` exports, add `HtAuthService`, `HtLoginComponent`, `AuthResult` exports
- [x] T021 [US1] Run `ng build ht-quick-ngxfire` — verify zero build errors

### Tests for User Story 1

- [x] T022 [US1] Write `projects/ht-quick-ngxfire/src/lib/auth/ht-auth.service.spec.ts` — mock `Auth`, test `signInWithProvider()`, `signInWithEmail()`, `createAccount()`, `signOut()`, `sendPasswordReset()`, test `currentUser` signal updates
- [x] T023 [US1] Write `projects/ht-quick-ngxfire/src/lib/auth/ht-login.component.spec.ts` — test SSO buttons render per `authOptions`, test email form renders when `email: true`, test `authResult` output emits, test loading/error states
- [x] T024 [US1] Run `ng test ht-quick-ngxfire --no-watch` — verify all tests pass (new + existing)

**Checkpoint**: US1 complete. `<ht-login>` works with all configured providers. Build and tests pass.

---

## Phase 4: User Story 2 — Consumer Protects Routes (Priority: P2)

**Goal**: Route guards work without FirebaseUI. `htAuthRedirectGuard` uses `HtAuthService` instead of `HtAuthUIService`.

**Independent Test**: Configure a route with `htAuthRedirectGuard` — verify unauthenticated users are redirected to login, authenticated users pass through.

**Depends on**: US1 (needs `HtAuthService` to exist)

### Implementation for User Story 2

- [x] T025 [US2] Update `htAuthRedirectGuard` in `projects/ht-quick-ngxfire/src/lib/auth/ht-auth-redirect.guard.ts` — inject `HtAuthService` instead of `HtAuthUIService`, remove `isPendingRedirect()` check, use `HtAuthService.currentUser` signal for auth check per FR-AUTH-12
- [x] T026 [US2] Run `ng build ht-quick-ngxfire` — verify zero build errors

### Tests for User Story 2

- [x] T027 [US2] Write or update tests for `htAuthRedirectGuard` in `projects/ht-quick-ngxfire/src/lib/auth/ht-auth-redirect.guard.spec.ts` — test redirect when unauthenticated, test pass-through when authenticated
- [x] T028 [US2] Run `ng test ht-quick-ngxfire --no-watch` — verify all tests pass

**Checkpoint**: US2 complete. Guards work without FirebaseUI dependency. Build and tests pass.

---

## Phase 5: User Story 3 — Consumer Uses Firestore Service (Priority: P3)

**Goal**: `HtFirestoreService` builds and works correctly with `@angular/fire` ^21.0.0. No `any` types leak into public API.

**Independent Test**: Run `ng build ht-quick-ngxfire` with zero errors and zero `any`-related warnings. Run existing Firestore tests.

**Depends on**: Phase 2 cleanup (already done)

### Implementation for User Story 3

- [x] T029 [US3] Verify `HtFirestoreService` compiles against `@angular/fire` ^21.0.0 — fix any compilation errors in `projects/ht-quick-ngxfire/src/lib/firestore/ht-quick-firestore.service.ts`
- [x] T030 [US3] Verify existing Firestore tests pass: run `ng test ht-quick-ngxfire --no-watch` and check `ht-quick-firestore.service.spec.ts` results

**Checkpoint**: US3 complete. Firestore service works with current AngularFire version.

---

## Phase 6: User Story 4 — Consumer Uses Storage Service (Priority: P4)

**Goal**: `HtStorageService` builds and works correctly with `@angular/fire` ^21.0.0. No deprecated APIs.

**Independent Test**: Run `ng build ht-quick-ngxfire` with zero errors. Storage methods compile without deprecation warnings.

**Depends on**: Phase 2 cleanup (already done)

### Implementation for User Story 4

- [x] T031 [US4] Verify `HtStorageService` compiles against `@angular/fire` ^21.0.0 — fix any compilation errors in `projects/ht-quick-ngxfire/src/lib/storage/ht-storage.service.ts`

**Checkpoint**: US4 complete. Storage service works with current AngularFire version.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, showcase app update, and full validation.

- [x] T032 Final review of `projects/ht-quick-ngxfire/src/public-api.ts` — ensure no `firebaseui` references remain, all new exports are present
- [x] T033 Run `ng build ht-quick-ngxfire` — verify clean build with no warnings
- [x] T034 Run `ng test ht-quick-ngxfire --no-watch` — verify all tests pass
- [x] T035 Update `ht-software` showcase app ngxfire demo to use `HtLoginComponent` instead of `HtAuthUIComponent` in `projects/ht-software/src/app/demos/ngxfire-demo/ngxfire-demo.component.ts`
- [x] T036 Run `ng build ht-software` — verify showcase app compiles
- [x] T037 Run quickstart.md validation — verify code snippets in `specs/001-quick-ngxfire/quickstart.md` match actual public API

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T001-T004) — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 — MVP, must complete first
- **US2 (Phase 4)**: Depends on US1 (needs `HtAuthService`)
- **US3 (Phase 5)**: Depends on Phase 2 only — can run in parallel with US1
- **US4 (Phase 6)**: Depends on Phase 2 only — can run in parallel with US1
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (Login)**: Depends on Phase 2 — no other story dependencies. **This is the MVP.**
- **US2 (Guards)**: Depends on US1 (needs `HtAuthService` from T016)
- **US3 (Firestore)**: Independent after Phase 2 — cleanup-only, can parallel with US1
- **US4 (Storage)**: Independent after Phase 2 — cleanup-only, can parallel with US1

### Within Each User Story

- Implementation before tests (tests validate the implementation)
- Build gate before test gate
- All tasks within a story are sequential unless marked [P]

### Parallel Opportunities

- T006, T007, T008, T009, T010, T011, T012, T013, T014 (Phase 2 cleanup) — all touch different files
- US3 and US4 can run in parallel with US1 (after Phase 2)
- US3 and US4 can run in parallel with each other

---

## Parallel Example: Phase 2 Cleanup

```bash
# All cleanup tasks touch different files — launch in parallel:
Task: "Remove console.log from ht-quick-firestore.service.ts"
Task: "Fix any types in ht-quick-firestore.service.ts"
Task: "Remove console.log from ht-storage.service.ts"
Task: "Remove console.log from ht-auth-admin.service.ts"
Task: "Fix getUsersByRole() in ht-auth-admin.service.ts"
Task: "Fix getUserRoleAsync() in ht-auth-admin.service.ts"
Task: "Remove console.log from ht-auth-user-sync.service.ts"
Task: "Fix syncUserToFirestore() in ht-auth-user-sync.service.ts"
Task: "Remove console.log from ht-role.guard.ts"
```

## Parallel Example: US3 + US4 alongside US1

```bash
# After Phase 2 completes, these can run in parallel:
# Stream A (US1 - MVP):
Task: "Create HtAuthService"
Task: "Create HtLoginComponent"

# Stream B (US3 + US4 - verification):
Task: "Verify HtFirestoreService compiles"
Task: "Verify HtStorageService compiles"
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational cleanup (T005-T015)
3. Complete Phase 3: US1 — Login component + auth service (T016-T024)
4. **STOP and VALIDATE**: `ng build` + `ng test` pass, `<ht-login>` renders correctly
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Clean codebase, no FirebaseUI references
2. Add US1 (Login) → MVP: working login component → Build + Test
3. Add US2 (Guards) → Guards use new auth service → Build + Test
4. Add US3 + US4 (Firestore/Storage verification) → Full compatibility confirmed
5. Polish → Showcase app updated, all gates pass

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US3 and US4 are verification-only stories (existing code, cleanup done in Phase 2)
- Total tasks: 37
- Tasks per story: US1=9, US2=4, US3=2, US4=1, Setup=4, Foundational=11, Polish=6
