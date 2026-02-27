# Feature Specification: ht-quick-ngxfire

**Feature Branch**: `001-quick-ngxfire`
**Created**: 2026-02-18
**Status**: Draft
**Input**: A set of Angular services for quickly setting up AngularFire with Firebase
authentication, Firestore, and storage

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Bootstrap Firebase in an Angular App in Minutes (Priority: P1)

A developer wants to add Firebase to their Angular app without manually configuring
AngularFire. They install ht-quick-ngxfire, call a single setup function with their
Firebase credentials, and gain immediate access to Firestore, authentication, and
storage without writing any boilerplate.

**Why this priority**: Reducing setup time is the entire value proposition of this
library. If a developer cannot go from zero to a working Firebase connection with
minimal code, the library has failed its primary goal.

**Independent Test**: A fresh Angular app calls the library's setup function with valid
Firebase credentials; a Firestore collection read returns data within 5 seconds. No
other library feature needs to exist for this to be an MVP.

**Acceptance Scenarios**:

1. **Given** a developer has a Firebase project and an Angular app, **When** they add
   the library's provider to their app configuration with their Firebase credentials,
   **Then** the app is connected to Firebase with no additional configuration required.
2. **Given** the library is configured, **When** a developer injects the Firestore
   service and reads a collection, **Then** they receive live data as an observable
   stream without writing any Firebase-specific setup code.
3. **Given** the library is configured with `firestore: false`, **When** the app starts,
   **Then** the Firestore service is not initialized and injecting it throws a clear error.

---

### User Story 2 - Authenticate Users with Minimal Code (Priority: P2)

A developer needs user authentication in their app. They enable email/password or
Google sign-in through the library's configuration and use a provided service to sign
in, sign out, and observe the current user — all without directly interacting with the
underlying Firebase Auth SDK.

**Why this priority**: Authentication is the second most common Firebase use case after
Firestore. Abstracting it reduces repeated boilerplate across every app that uses the
library.

**Independent Test**: With auth enabled in configuration, calling the sign-in method
with valid credentials produces an authenticated user observable that emits the user
object. Testable without Firestore or storage being enabled.

**Acceptance Scenarios**:

1. **Given** auth is enabled with `email: true`, **When** a developer calls the
   sign-in method with a valid email and password, **Then** the current-user observable
   emits the authenticated user within 3 seconds.
2. **Given** auth is enabled with `google: true`, **When** a developer calls the
   Google sign-in method, **Then** the browser opens the Google OAuth popup and, upon
   success, the current-user observable emits the authenticated user.
3. **Given** a user is signed in, **When** the sign-out method is called, **Then** the
   current-user observable emits `null` and no further authenticated requests can be made.
4. **Given** auth is enabled with `email: false` and `google: false`, **When** a developer
   attempts to call the sign-in method, **Then** a clear error is returned explaining
   that no auth providers are enabled.

---

### User Story 3 - Perform Firestore CRUD Without Firebase Boilerplate (Priority: P3)

A developer needs to read, write, update, and delete Firestore documents. They use the
library's Firestore service methods — passing only the collection path and data — and
receive observable streams or resolved promises, with no direct Firestore SDK calls
in their application code.

**Why this priority**: Firestore operations are the most repeated Firebase code in any
app. Encapsulating them reduces duplication across the codebase (DRY) and lowers the
learning curve for developers new to Firebase.

**Independent Test**: Given a configured Firestore connection, calling `getCollectionData`
with a valid collection path returns an observable that emits an array of documents.
Independently testable against a live or emulated Firebase project.

**Acceptance Scenarios**:

1. **Given** Firestore is enabled, **When** a developer calls `getCollectionData` with
   a valid collection path, **Then** they receive a live observable that emits the
   current documents and updates when data changes.
2. **Given** Firestore is enabled, **When** a developer calls `addDoc` with a
   collection path and a data object, **Then** a new document appears in Firestore
   and a resolved promise confirms success.
3. **Given** Firestore is enabled, **When** a developer calls `updateDoc` with a
   document path and partial data, **Then** only the specified fields are updated and
   unchanged fields are preserved.
4. **Given** Firestore is enabled, **When** a developer calls `deleteDoc` with a
   document path, **Then** the document is removed from Firestore and the observable
   stream updates to reflect the deletion.
5. **Given** Firestore is enabled, **When** a developer calls `writeBatch` with multiple
   operations, **Then** all operations complete atomically — either all succeed or none
   are applied.

---

### User Story 4 - Consume the Library Without Installing AngularFire (Priority: P4)

A developer's Angular app should not need to install AngularFire or Firebase as direct
dependencies. ht-quick-ngxfire bundles what it needs so the consuming app only installs
this one library.

**Why this priority**: The library's signature value-add over raw AngularFire is that
consumers do not need to manage the AngularFire dependency themselves.

**Independent Test**: A new Angular app with only ht-quick-ngxfire in `package.json`
(no `@angular/fire` or `firebase`) builds successfully and connects to Firebase.

**Acceptance Scenarios**:

1. **Given** an Angular app lists only `ht-quick-ngxfire` in its dependencies (no
   `@angular/fire` or `firebase`), **When** the app is built, **Then** the build
   succeeds and Firebase features work at runtime.
2. **Given** the library is updated to a newer AngularFire version, **When** a consuming
   app rebuilds without changing its own `package.json`, **Then** the consuming app
   automatically uses the updated AngularFire version bundled inside the library.

---

### Edge Cases

- What happens when invalid Firebase credentials are passed to the setup function? The
  library must surface a descriptive error at initialization time, not silently fail at
  the first data call.
- What happens when a developer calls a Firestore method before the library is
  initialized? A clear error must be thrown indicating the setup function has not been
  called.
- What happens when `storage: false` is set but a developer injects the storage service?
  A clear error must indicate that storage was not enabled in the configuration.
- What happens when a Firestore document path does not exist and `getDocData` is called?
  The observable must emit `null` or `undefined`, not throw an unhandled error.
- What happens when the Firebase emulator is in use? The library must support emulator
  configuration without requiring code changes beyond configuration.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The library MUST provide a single setup function (provider) that accepts
  a Firebase configuration object and optional feature flags (firestore, auth, storage,
  database, functions) to initialize only the requested Firebase services.
- **FR-002**: The library MUST expose a Firestore service with the following operations:
  `getCollectionData`, `getDocData`, `addDoc`, `updateDoc`, `setDoc`, `deleteDoc`,
  `writeBatch`, `getCountFromServer`, and `createCollectionRef`.
- **FR-003**: The library MUST expose an authentication service supporting email/password
  sign-in, Google OAuth sign-in, sign-out, and a current-user observable, each
  controllable via the feature flags in the setup configuration.
- **FR-004**: Calling any service method for a feature that was not enabled in
  configuration MUST produce a clear, descriptive error.
- **FR-005**: The library MUST bundle its Firebase and AngularFire dependencies so that
  consuming apps do not need to install them separately.
- **FR-006**: All Firestore collection and document observables MUST emit updated values
  in real time when the underlying Firestore data changes.
- **FR-007**: The library MUST support TypeScript generics on all data-reading methods
  so that consumers can specify the expected document shape and receive typed results.
- **FR-008**: The library MUST be independently buildable and publishable as an npm
  package without any changes to its consuming app.

### Key Entities

- **Firebase Configuration**: The credentials and feature flags passed at setup;
  determines which Firebase services are initialized for the session.
- **Firestore Service**: Encapsulates all document and collection operations; exposes
  typed observable streams and promise-based write methods.
- **Auth Service**: Manages user sign-in, sign-out, and the current authenticated-user
  state; supports email/password and Google OAuth providers.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can go from installing the library to a working Firestore
  collection read in 5 minutes or fewer, following only the library's documentation.
- **SC-002**: A consuming app with only `ht-quick-ngxfire` in its dependencies builds
  successfully without `@angular/fire` or `firebase` listed anywhere in the app's own
  `package.json`.
- **SC-003**: All Firestore observable streams emit updated values within 1 second of
  a data change in Firebase.
- **SC-004**: Every invalid configuration scenario (disabled feature accessed, missing
  credentials) produces a human-readable error message — zero silent failures.
- **SC-005**: The library builds independently with `ng build ht-quick-ngxfire` in
  under 60 seconds with zero errors.

## Assumptions

- The library targets Angular 21 and AngularFire 20+; older versions are out of scope.
- Storage and Functions services are included as future-proofing; their full API surface
  may be minimal in the initial release but must be placeable behind feature flags.
- The Firebase emulator suite is a supported configuration but not the primary use case;
  documentation for emulator setup is outside the scope of this spec.
- Role and permission data for authenticated users is stored as fields on the Firestore
  `users/{uid}` document, not in subcollections, per the project's established pattern.
