# Phase 1 Data Model: ht-quick-ngxfire Simulation Mode

**Branch**: `004-ngxfire-sim-mode`
**Date**: 2026-05-09
**Inputs**: [spec.md](./spec.md), [research.md](./research.md)

This document fully specifies the runtime entities introduced by simulation mode — their fields, lifecycle, validation rules, and relationships. Contracts (TypeScript interfaces) are in `contracts/`; this document is the conceptual model.

---

## E1. `SimulationPolicy` (config value type)

**Kind**: String literal union (config field).
**Source**: Set on `FirebaseConfig.simulation` by the consumer at app bootstrap. Default `'auto'` if omitted.
**Values**:
- `'auto'` — follow `isDevMode()`. Missing required fields → simulate in dev / throw in prod.
- `'force'` — allow simulation regardless of build mode. Missing fields always activate simulators.
- `'forbid'` — never simulate. Missing fields always throw.
**Lifecycle**: Read once by `provideHtQuickNgxFire` at app init. Immutable thereafter.
**Validation**: Must be one of the three literals or `undefined`. The activation function rejects any other value with a `HtQuickNgxFireError` that names the offending value.

---

## E2. `RequiredFieldsMap` (frozen constant)

**Kind**: Module-level frozen object — the single source of truth for FR-001a.
**Shape**:

| Service | Required `firebaseOptions` fields |
|---|---|
| `auth` | `apiKey`, `authDomain` |
| `firestore` | `apiKey`, `projectId` |
| `database` | `apiKey`, `databaseURL` |
| `functions` | `apiKey`, `projectId` |
| `storage` | `apiKey`, `storageBucket` |

**Lifecycle**: Defined as a `const` and exported (test-readable) but **not** added to the public-api barrel. Frozen via `Object.freeze` to prevent mutation.
**Validation rule**: A field counts as "present" iff it is a string and `.trim() !== ''` (R5).
**Why it lives in code**: Both the activation decision (R6) and the prod-mode error message (FR-005) read from this single map. Moving it to runtime config would invite drift; freezing it as a constant aligns with DRY.

---

## E3. `ServiceName`

**Kind**: String literal union.
**Values**: `'auth' | 'firestore' | 'database' | 'functions' | 'storage'`.
**Purpose**: Domain key used by every other entity in this document. Cross-references the keys in `E2 RequiredFieldsMap`, `E4 ServiceMode`, `E5 ActivationDecision.services`, `E6 SimulationStatus.services`.

---

## E4. `ServiceMode`

**Kind**: String literal union.
**Values**: `'real' | 'simulated' | 'disabled'`.
**Semantics**:
- `'real'` — service is registered with the real `@angular/fire` provider.
- `'simulated'` — service is registered against the in-memory simulator backend.
- `'disabled'` — service is not registered (consumer set the flag to `false` in `FirebaseConfig`, or auth has zero providers enabled per R4).

---

## E5. `ActivationDecision`

**Kind**: Plain data record returned by the pure `decideActivation(...)` function.
**Fields**:
- `services: Record<ServiceName, ServiceMode>` — the per-service result.
- `policyResolved: 'simulate' | 'throw'` — what `'auto'` resolved to (`'simulate'` in dev, `'throw'` in prod). For `'force'` always `'simulate'`; for `'forbid'` always `'throw'`. Used by the provider to decide whether to register simulator backends or throw.
- `missingFieldsByService: Partial<Record<ServiceName, string[]>>` — for any service whose required fields were absent, the list of those field names. Drives both the `console.warn` body (FR-004) and the `HtQuickNgxFireError` message (FR-005).
- `error: HtQuickNgxFireError | null` — populated when at least one service is under-configured AND `policyResolved === 'throw'`. The provider throws this; otherwise it is `null`.

**Lifecycle**: Constructed once per `provideHtQuickNgxFire` call. Immutable. Consumed exactly once by the provider.
**Validation**:
- Must contain a key for each `ServiceName` (no holes).
- A service can be `'disabled'` regardless of any `firebaseOptions` content (the consumer chose to opt out).
- A service marked `'simulated'` MUST have an entry in `missingFieldsByService` (or the empty-config case where the consumer omitted `firebaseOptions` entirely).
- `error !== null` iff at least one service is `'simulated'` AND `policyResolved === 'throw'`.

---

## E6. `SimulationStatus` (read-only injectable surface)

**Kind**: Singleton injectable service (`SimulationStatusService`) — the public-API surface for FR-007.
**Fields** (read-only):
- `services: ReadonlyMap<ServiceName, ServiceMode>` — frozen map populated by the provider at init.
- `isAnySimulated: boolean` — derived; `true` iff any value in `services` equals `'simulated'`.
- `policyResolved: 'simulate' | 'throw'` — for transparency to consumers.
**Methods**:
- `get(name: ServiceName): ServiceMode` — convenience accessor; throws if name is invalid.
**Lifecycle**: Provided in `'root'`. Populated by `provideHtQuickNgxFire` via a multi-provider `APP_INITIALIZER` that runs before any `Ht*Service` is constructed (so the constructor-time backend switch in each `Ht*Service` always sees a populated status).
**Why singleton**: Cross-service consistency (R10). One status, one truth, every consumer reads the same map.

---

## E7. `SimAuthBackend`

**Kind**: Injectable in-memory backend backing `HtAuthService` in simulation.
**State**:
- `currentUser: BehaviorSubject<User | null>` — replays the latest sign-in to subscribers (drives `user$` and `currentUser` signals in `HtAuthService`).
- `uidByIdentifier: Map<string, string>` — deterministic uid lookup (R8 / FR-009). Key = email or `${providerId}:${displayName}`; value = synthesized uid.
**Methods** (mirror `HtAuthService` consumer-facing API):
- `signInWithEmail(email, password) → Promise<UserCredential>` — resolves on next microtask with a synthesized `User` whose `email`, `uid` (deterministic), `displayName` (derived from the local-part of the email), and `providerData[0].providerId = 'password'` are populated.
- `createAccount(email, password) → Promise<UserCredential>` — same as above with `additionalUserInfo.isNewUser = true` on first call per email; `false` on subsequent calls.
- `signInWithProvider(providerId, preferRedirect?) → Promise<UserCredential>` — synthesizes a provider-shaped `User` whose `providerData[0].providerId === providerId`. `preferRedirect` is honored in shape only (the simulator ignores popup-vs-redirect distinction since there's no popup to block); the returned `UserCredential` is the same regardless.
- `signOut() → Promise<void>` — clears `currentUser`, resolves on next microtask.
- `sendPasswordReset(email) → Promise<void>` — resolves on next microtask. No-op (no email is sent).
**Lifecycle**: Plain `@Injectable()` (NOT `providedIn: 'root'`). Registered as a provider by `provideHtQuickNgxFire` only when the activation decision resolves `services.auth === 'simulated'`. Effective scope is the root injector once registered, so a single instance is shared by every consumer for the duration of the page session. State resets only on page reload (FR-014).
**Validation**:
- Email format must pass a basic regex check (mirrors what HTML5 `type="email"` would catch); otherwise rejects with a Firebase-shaped `auth/invalid-email` error so consumer code that branches on Firebase error codes still works.
- Empty password rejects with `auth/missing-password`.

---

## E8. `SimFirestoreBackend`

**Kind**: Injectable in-memory document store backing `HtFirestoreService`, `HtAuthAdminService`, and `HtAuthUserSyncService` in simulation (R10).
**State**:
- `documents: Map<string, Map<string, DocumentData>>` — outer key = collection path (slash-delimited); inner key = document id; value = the document data.
- `listeners: Map<string, Set<(snapshot: SimSnapshot) => void>>` — keyed by collection path or document path; subscribers fan out on writes.
- `transactionWarningEmitted: boolean` — one-time guard for FR-010a's transaction warning.
**Methods** (mirror `HtFirestoreService` public surface):
- Reads: `getCollectionData<T>(pathOrQuery, passId?)`, `getCollectionSnapshots<T>(query)`, `getDocData(path, converter?, passId?)`, `getDocSnapshots(path, converter?)`.
- Writes: `addDoc(path, data)`, `setDoc(path, data)`, `updateDoc(path, data)`, `deleteDoc(path)`.
- Aggregation: `getCountFromServer(pathOrQuery)`.
- Batched / transactional: `writeBatch(operations)`, `runTransaction(updateFn)`.
- Query construction: `createCollectionRef(path, converter?)`, `getCollectionRef(path)`, `createDocRef(path, id)`, `createQuery(path, ...)`, `createCollectionGroupQuery(collectionId, ...)`.
**Query engine semantics**:
- `where`: equality and ordered comparators evaluated against the document's flat fields. Compound (`and`/`or`) supported.
- `orderBy`: stable JS sort; ties broken by document id ascending.
- `limit`: head N after ordering.
- Snapshot listeners receive the **current** result set on subscribe and a fresh result set on every matching write.
**Transaction semantics** (FR-010a):
- Single-pass: clone the document store, run the callback against the clone, commit the clone atomically. No version tracking, no retries.
- First call per session emits the FR-010a warning via `console.warn`; subsequent calls do not.
**Lifecycle**: Plain `@Injectable()` (NOT `providedIn: 'root'`). Registered as a provider by `provideHtQuickNgxFire` only when the activation decision resolves `services.firestore === 'simulated'`. Effective scope is the root injector once registered, so the singleton is shared by `HtFirestoreService`, `HtAuthAdminService`, and `HtAuthUserSyncService` (R10). State resets only on page reload.

---

## E9. `SimStorageBackend`

**Kind**: Injectable in-memory blob store backing `HtStorageService` in simulation.
**State**:
- `objects: Map<string, { blob: Blob; metadata: Record<string, unknown>; contentType: string }>` — keyed by storage path.
- `urls: Map<string, string>` — keyed by storage path; values are blob URLs created via `URL.createObjectURL` for the lifetime of the page session.
**Methods** (mirror `HtStorageService`):
- `upload(path, blob, metadata?) → UploadTask-shaped object` — emits a synthetic progress event (`{ bytesTransferred: blob.size, totalBytes: blob.size, state: 'success' }`) on next microtask, then the success state. Returns an object whose `.snapshot.ref.fullPath` matches the input path.
- `getDownloadURL(path) → Promise<string>` — returns the blob URL for the path.
- `getMetadata(path)`, `updateMetadata(path, partial)`, `delete(path)` — all next-microtask Promises against the in-memory store.
**Lifecycle**: Plain `@Injectable()` (NOT `providedIn: 'root'`). Registered as a provider by `provideHtQuickNgxFire` only when the activation decision resolves `services.storage === 'simulated'`. Effective scope is the root injector once registered. On page unload, `URL.revokeObjectURL(...)` is called for every entry (browser does this automatically on navigation, but the simulator does it eagerly on its `ngOnDestroy` for clean test teardown).

---

## E10. `SimDatabaseBackend`

**Kind**: Injectable in-memory tree store for Realtime Database simulation.
**State**:
- `tree: Record<string, unknown>` — nested JSON tree.
- `listeners: Map<string, Set<(snapshot: unknown) => void>>` — keyed by ref path; fired on writes that mutate any descendant.
**Methods** (mirror what Firebase RTDB consumers expect):
- `set(path, value)`, `update(path, partial)`, `remove(path)`, `push(path, value)` (returns synthesized push key based on incrementing counter), `onValue(path, callback)` (callback fires once with `null` on subscribe to absent paths, matching real RTDB), `once(path) → Promise<unknown>` (resolves `null` for absent paths).
**Lifecycle**: Plain `@Injectable()` (NOT `providedIn: 'root'`). Registered as a provider by `provideHtQuickNgxFire` only when the activation decision resolves `services.database === 'simulated'`. State resets only on page reload.

---

## E11. `SimFunctionsBackend`

**Kind**: Injectable callable-Functions simulator.
**State**:
- `stubs: Map<string, (payload: unknown) => unknown | Promise<unknown>>` — registered per-callable handlers.
- `unregisteredWarned: Set<string>` — names already warned about (R3).
**Methods**:
- `httpsCallable(name) → (payload) => Promise<{ data: unknown }>` — returns a callable. If `stubs.has(name)`, runs the handler; otherwise returns `{ data: null }` and emits a one-time `console.warn`.
- `registerStub(name, handler)` — public for consumer demo seeding and per-test setup.
- `clearStubs()` — public for per-test isolation.
**Lifecycle**: Plain `@Injectable()` (NOT `providedIn: 'root'`). Registered as a provider by `provideHtQuickNgxFire` only when the activation decision resolves `services.functions === 'simulated'`. `stubs` and `unregisteredWarned` reset only on page reload.

---

## E12. State transitions & invariants

```text
    Provider invocation                Service construction
    ───────────────────                ──────────────────────
    consumer calls                     each Ht*Service injects
    provideHtQuickNgxFire(config)      SimulationStatusService
            │                                  │
            ▼                                  ▼
    decideActivation({config,          status.get('<service>')
        isDevMode: isDevMode()})       === 'simulated'
            │                                  │
            ▼                          ┌───────┴───────┐
    if error !== null → throw         use Sim*Backend  use real Auth/Firestore/...
            │
            ▼
    register provideAuth/Firestore/... only for services
    whose decision === 'real'
            │
            ▼
    populate SimulationStatusService from decision.services
            │
            ▼
    emit deduplicated console.warn (FR-004) if any 'simulated'
```

**Invariants**:
- **I1**: For each `ServiceName`, `SimulationStatus.get(name)` returns the same value as `ActivationDecision.services[name]` for the duration of the page session.
- **I2**: A service is registered with `provideAuth` / `provideFirestore` / etc. **iff** its decision is `'real'`. The paired `Sim*Backend` is registered as a provider by `provideHtQuickNgxFire` **iff** that service's decision is `'simulated'` (so consumers in a `'forbid'`-with-complete-config build never end up with simulator backends in their injector, and the `simulation/` subtree can be tree-shaken from the production bundle). When registered, the backend is effectively root-scoped — consumers may inject it directly to seed demo data, as documented in `quickstart.md`.
- **I3**: `SimFirestoreBackend` is a singleton — every `Ht*Service` that operates on Firestore in simulation reads from the same instance (R10).
- **I4**: All simulator backend state resets to its initial value on page reload (FR-014). Nothing is persisted to `localStorage`, `sessionStorage`, IndexedDB, or cookies.
- **I5**: `decideActivation` is pure — given the same input it always returns an equal `ActivationDecision`. No side effects, no I/O.

---

## E13. Relationships diagram

```text
FirebaseConfig (E1 SimulationPolicy field, E2 keys)
    │  consumed at init by
    ▼
provideHtQuickNgxFire ──── decideActivation(...) ── ActivationDecision (E5)
                                                       │
                                ┌──────────────────────┼──────────────────────┐
                                ▼                      ▼                      ▼
                      throw if error!=null     populate Status (E6)    register providers (per-service):
                                                       │                  ─ real → provideAuth/Firestore/...
                                                       │                  ─ simulated → register Sim*Backend class
                                                       │                  ─ disabled → register nothing
                                                       ▼
                                            SimulationStatusService
                                                       │
   ┌───────────────────────────────────────────────────┴───────────────────────────────────┐
   │                                                                                       │
   │ Three services route through Ht*Service wrappers:                                     │ Two services are
   │   reads at construction → constructor branch                                          │ accessed directly
   │                                                                                       │ (no wrapper exists):
   ▼                                                                                       ▼
HtAuthService            HtFirestoreService                HtStorageService          consumer code injects
  branch:                  branch:                            branch:                  ─ SimDatabaseBackend
   sim → SimAuthBackend    sim → SimFirestoreBackend          sim → SimStorageBackend  ─ SimFunctionsBackend
   real → Auth (optional)  real → Firestore (optional)        real → Storage (optional) directly when status
                                                                                       reports 'simulated';
HtAuthAdminService and HtAuthUserSyncService also route through                         or @angular/fire/database
HtFirestoreService → so they share the same SimFirestoreBackend                        / @angular/fire/functions
singleton in simulation (R10) and the same real Firestore in real mode.                tokens when 'real'.

   Sim*Backend (E7..E11) ─→ in-memory state (resets on page reload, FR-014)
```

The asymmetry — three wrapped services, two unwrapped — reflects the existing public surface of `ht-quick-ngxfire`. This feature does not introduce `HtRealtimeDatabaseService` or `HtFunctionsService`; the activation decision and status surface treat all five services uniformly, but the consumer-side access pattern is whatever it was before this feature.
