# ht-quick-ngxfire

Opinionated Angular 21 wrapper around `@angular/fire` that gives you signal-based auth, a thin Firestore wrapper, a Storage wrapper, a drop-in login component, route guards for auth + roles, and a **simulation mode** that lets the same code run with zero Firebase config in dev.

> AI-agent README: this file is the source of truth for surface, types, and behavior. Section headings are stable; symbol names match `public-api.ts` exactly. When in doubt, prefer reading the linked source file over guessing.

---

## TL;DR for agents

- **Bootstrap** with `provideHtQuickNgxFire(config)` in `app.config.ts`. Don't import individual `provideAuth` / `provideFirestore` calls yourself — `provideHtQuickNgxFire` wires them based on the boolean flags in `FirebaseConfig`.
- **Inject services**, never call `@angular/fire` SDK functions directly from feature code. Every wrapper service auto-routes to either the real SDK or an in-memory `Sim*Backend` based on the activation decision.
- **Simulation mode** is on by default in `isDevMode()` when `firebaseOptions` is missing/incomplete. In prod, missing fields throw `SimulationActivationError` unless `simulation: 'force'` is set.
- **One config controls five services** — `auth` (truthy iff any provider flag), `firestore`, `database`, `functions`, `storage`. Each service resolves independently to `'real' | 'simulated' | 'disabled'`.
- **Never `npm install` inside `projects/ht-quick-ngxfire/`** — install at the workspace root only. Library `peerDependencies` (`@angular/core`, `@angular/common`, `@angular/fire`) must come from the consuming app to avoid `NG0203` injection-context errors.

---

## Install

```bash
# In the consuming app
npm install ht-quick-ngxfire @angular/fire firebase
```

`package.json` peer deps:

```json
{
  "@angular/common": "^21.2.0",
  "@angular/core": "^21.2.0",
  "@angular/fire": "^21.0.0-rc.0"
}
```

---

## Bootstrap

`provideHtQuickNgxFire(config)` is an `EnvironmentProviders` factory. Call it once in `app.config.ts`:

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHtQuickNgxFire } from 'ht-quick-ngxfire';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHtQuickNgxFire({
      authOptions: { email: true, google: true },
      firestore: true,
      database: false,
      functions: false,
      storage: true,
      firebaseOptions: {
        apiKey: 'xxx',
        authDomain: 'app.firebaseapp.com',
        projectId: 'app',
        storageBucket: 'app.appspot.com',
        // databaseURL: '…' // required iff database: true
      },
      simulation: 'auto', // 'auto' (default) | 'force' | 'forbid'
    }),
  ],
};
```

### `FirebaseConfig` shape

| Field             | Type                       | Notes |
|-------------------|----------------------------|-------|
| `authOptions`     | `AuthOptions`              | Truthy provider flag → auth enabled. See below. |
| `firebaseOptions` | `FirebaseOptions \| undefined` | Standard Firebase init options. Omit/partial → simulation. |
| `firestore`       | `boolean`                  | Required: enables Firestore service. |
| `database`        | `boolean`                  | Required: enables RTDB. |
| `functions`       | `boolean`                  | Required: enables Cloud Functions. |
| `storage`         | `boolean`                  | Required: enables Storage. |
| `simulation`      | `'auto' \| 'force' \| 'forbid'` | Optional. See **Simulation mode** below. |

### `AuthOptions` shape

All optional booleans. **Any** truthy flag enables the auth service.

```typescript
interface AuthOptions {
  email?: boolean;
  google?: boolean;
  facebook?: boolean;
  twitter?: boolean;
  github?: boolean;
  microsoft?: boolean;
  apple?: boolean;
  preferRedirect?: boolean; // SSO uses redirect flow instead of popup
}
```

### Per-service required `firebaseOptions` fields

Source: `src/lib/simulation/simulation.types.ts` (`REQUIRED_FIELDS_BY_SERVICE`).

| Service     | Required fields                |
|-------------|--------------------------------|
| `auth`      | `apiKey`, `authDomain`         |
| `firestore` | `apiKey`, `projectId`          |
| `database`  | `apiKey`, `databaseURL`        |
| `functions` | `apiKey`, `projectId`          |
| `storage`   | `apiKey`, `storageBucket`      |

If any enabled service is missing a required field, the activation decision routes that service to `'simulated'` (under `auto`/`force`) or throws `SimulationActivationError` (under `forbid`, or under `auto` in prod).

---

## Public API surface

Exported from `public-api.ts`:

**Providers + config**
- `provideHtQuickNgxFire(config: FirebaseConfig): EnvironmentProviders`
- `FIREBASE_CONFIG`, `AUTH_OPTIONS` — `InjectionToken`s (internal use; you rarely inject these directly)
- `FirebaseConfig`, `AuthOptions` — interfaces

**Errors**
- `HtQuickNgxFireError` — base error with `code`
- `SimulationActivationError` — thrown when policy resolves to `'throw'` and any enabled service is under-configured. Carries `underConfigured: Readonly<Partial<Record<ServiceName, string[]>>>`.

**Auth**
- `HtAuthService` — sign-in / sign-up / sign-out. Exposes `user$: Observable<User|null>` and `currentUser: Signal<User|null>`.
- `HtAuthAdminService` — admin / role / permission ops, user invite, profile updates.
- `HtAuthUserSyncService` — auto-syncs auth state into `users/{uid}` doc. Runs from `APP_INITIALIZER`; you usually don't touch it.
- `HtLoginComponent` (selector: `ht-login`) — turnkey login UI.
- `AuthResult` interface
- `htRoleGuard`, `htAdminGuard`, `createRoleGuard(roles, redirectTo?)`, `htAuthRedirectGuard` — functional `CanActivateFn`s

**Firestore**
- `HtFirestoreService` — refs, queries, reads (Observable), writes, batch, transactions, count.
- `FireStoreBatchOperation` — discriminated-union class for `set | update | delete`.

**Storage**
- `HtStorageService` — upload (incl. resumable + progress), download URLs, list, delete, metadata.

**Simulation (read-only surface)**
- `SimulationStatusService` — inject to render demo-mode UI. `get(name) → 'real' | 'simulated' | 'disabled'`.
- Types: `SimulationPolicy`, `ServiceName`, `ServiceMode`, `ActivationDecision`
- Backend classes (only useful for advanced tests / stub injection): `SimAuthBackend`, `SimFirestoreBackend`, `SimStorageBackend`, `SimDatabaseBackend`, `SimFunctionsBackend`

**Not exported** (intentionally internal): `decideActivation`, `REQUIRED_FIELDS_BY_SERVICE`, `SERVICE_NAMES`, `SimulationStatusService._apply`.

---

## Services

### `HtAuthService` — `src/lib/auth/ht-auth.service.ts`

Sign-in / sign-out for the current user. Sim-aware: routes to `SimAuthBackend` when `auth === 'simulated'`.

**Reactive state**

| Member        | Type                              | Source line |
|---------------|-----------------------------------|-------------|
| `user$`       | `Observable<User \| null>`         | `ht-auth.service.ts:33` |
| `currentUser` | `Signal<User \| null>`             | `ht-auth.service.ts:36` |

**Methods**

| Method | Signature |
|--------|-----------|
| `signInWithProvider` | `(providerId: string, preferRedirect?: boolean) => Promise<UserCredential>` |
| `signInWithEmail`    | `(email: string, password: string) => Promise<UserCredential>` |
| `createAccount`      | `(email: string, password: string) => Promise<UserCredential>` |
| `signOut`            | `() => Promise<void>` |
| `sendPasswordReset`  | `(email: string) => Promise<void>` |

`providerId` accepts: `'google.com' | 'facebook.com' | 'twitter.com' | 'github.com' | 'microsoft.com' | 'apple.com'`. Anything else falls through to `new OAuthProvider(id)`.

### `HtAuthAdminService` — `src/lib/auth/ht-auth-admin.service.ts`

Admin operations. Roles + permissions are stored at `users/{uid}` in Firestore with shape `UserRole { role, permissions[], createdAt?, updatedAt? }` and `UserProfile { uid, email, displayName, photoURL, role?, disabled?, … }`.

**Account lifecycle**

| Method | Notes |
|--------|-------|
| `sendPasswordResetEmail(email, actionCodeSettings?)` | Real auth or sim no-op. |
| `inviteUserByEmail(email, role='user', permissions?, actionCodeSettings?)` | Creates account with random temp password, writes profile to `users/{uid}`, sends reset email. Cleans up on Firestore failure. |
| `updateUserPassword(newPassword)` | Sim mode = no-op (FR-002). |
| `updateUserEmail(newEmail)` | Sim mode = no-op. |
| `updateUserProfile({ displayName?, photoURL? })` | Sim mode = no-op. |
| `reauthenticateUser(email, password)` | Sim mode = no-op. |
| `deleteCurrentUser()` | Sim mode = no-op. |

**Roles**

| Method | Returns |
|--------|---------|
| `assignUserRole(userId, role, permissions?)` | `Promise<void>` |
| `getUserRole(userId)` | `Observable<UserRole \| undefined>` |
| `getUserRoleAsync(userId)` | `Promise<UserRole \| null>` |
| `removeUserRole(userId)` | `Promise<void>` |
| `updateUserPermissions(userId, permissions[])` | `Promise<void>` |
| `addUserPermissions(userId, permissions[])` | `Promise<void>` |
| `removeUserPermissions(userId, permissions[])` | `Promise<void>` |
| `hasRole(userId, role)` | `Promise<boolean>` |
| `hasPermission(userId, permission)` | `Promise<boolean>` |
| `hasAnyPermission(userId, permissions[])` | `Promise<boolean>` |
| `hasAllPermissions(userId, permissions[])` | `Promise<boolean>` |
| `batchAssignRoles([{userId, role, permissions?}])` | `Promise<void>` (uses `writeBatch`) |

**Profile**

| Method | Returns |
|--------|---------|
| `setUserProfile(userId, profile)` | `Promise<void>` |
| `getUserProfile(userId)` | `Observable<UserProfile \| undefined>` |
| `updateUserProfileFields(userId, updates)` | `Promise<void>` |
| `setUserDisabled(userId, disabled)` | `Promise<void>` (sets `disabled` field; does NOT disable real Auth) |
| `getUsersByRole(role)` | `Observable<UserProfile[]>` |

**Current-user shortcuts**

`getCurrentUserRole()`, `isCurrentUserAdmin()`, `currentUserHasPermission(permission)`.

> Note: the older `ADMIN_AUTH_USAGE.md` doc mentions `hasPermissionAsync`/`hasAnyPermissionAsync`/`isCurrentUserAdmin$` etc. The canonical names are the ones above (no `Async` suffix; `isCurrentUserAdmin` returns `Promise<boolean>`).

### `HtAuthUserSyncService` — `src/lib/auth/ht-auth-user-sync.service.ts`

Subscribes to `auth.onAuthStateChanged` (real) or `HtAuthService.user$` (sim) and upserts `users/{uid}` on every sign-in. Created eagerly by `APP_INITIALIZER` in `provideHtQuickNgxFire`. The default profile shape on first sync:

```typescript
{
  uid, email, displayName, photoURL, emailVerified,
  role: 'user',
  permissions: ['read:posts', 'create:posts', 'edit:own:posts'],
  createdAt, lastLogin, updatedAt
}
```

Call `syncCurrentUser()` if you need to force a re-sync.

### `HtFirestoreService` — `src/lib/firestore/ht-quick-firestore.service.ts`

**Reference construction**

| Method | Returns |
|--------|---------|
| `createCollectionRef(path, converter?)` | `CollectionReference` |
| `getCollectionRef(path)` | `CollectionReference` (cached) |
| `createDocRef(path, id)` | `DocumentReference` |
| `createQuery(path, queryConstraints?, compositeFilter?)` | `Query` |
| `createCollectionGroupQuery(collectionId, ...constraints)` | `Query` |

**Reads** (Observable-based; auto-tear-down via Angular's injection context)

| Method | Returns |
|--------|---------|
| `getCollectionData<T>(pathOrQuery, passId=true)` | `Observable<T[]>` (adds `id` field by default) |
| `getCollectionSnapshots<T>(query)` | `Observable<T[]>` |
| `getDocData(path, converter?, passId=true)` | `Observable<DocumentData>` |
| `getDocSnapshots(path, converter?)` | `Observable<DocumentSnapshot>` |

**Writes**

| Method | Returns |
|--------|---------|
| `addDoc(path, data)` | `Promise<DocumentReference>` (real) or `Promise<{id, path}>` (sim) |
| `setDoc(docPath, data)` | `Promise<void>` |
| `updateDoc(docPath, data)` | `Promise<void>` |
| `deleteDoc(docPath)` | `Promise<void>` |
| `writeBatch(ops: FireStoreBatchOperation[])` | `Promise<void>` |
| `runTransaction(fn)` | `Promise<T>` (sim is single-pass atomic, see `FR-010a`) |
| `getCountFromServer(pathOrQuery)` | `Promise<number>` |

**`FireStoreBatchOperation`** — `src/lib/firestore/batch-operations.model.ts`

```typescript
new FireStoreBatchOperation('set' | 'update', docPath, data)
new FireStoreBatchOperation('delete', docPath)
```

### `HtStorageService` — `src/lib/storage/ht-storage.service.ts`

| Method | Returns |
|--------|---------|
| `createRef(path)` | `StorageReference` |
| `uploadFile(path, data, metadata?)` | `Promise<UploadResult>` |
| `uploadFileResumable(path, data, metadata?)` | `UploadTask` |
| `uploadString(path, data, format?, metadata?)` | `Promise<UploadResult>` |
| `uploadWithProgress(path, data, metadata?, onProgress?)` | `Promise<string>` (download URL) |
| `uploadMultipleFiles([{path, data, metadata?}, …])` | `Promise<UploadResult[]>` |
| `getDownloadURL(path)` | `Observable<string>` |
| `getDownloadURLAsync(path)` | `Promise<string>` |
| `deleteFile(path)` | `Promise<void>` |
| `deleteMultipleFiles(paths)` | `Promise<void[]>` |
| `listAll(path, _maxResults?)` | `Promise<ListResult>` |
| `getMetadata(path)` / `getMetadataAsync(path)` | `Observable<FullMetadata>` / `Promise<FullMetadata>` |
| `updateMetadata(path, metadata)` | `Promise<FullMetadata>` |
| `monitorUploadProgress(uploadTask)` | `Observable<number>` (0–100) |

---

## Components

### `<ht-login>` — `src/lib/auth/ht-login.component.ts`

Standalone, OnPush, signal-based login UI. Renders configured SSO buttons + optional email/password form with built-in sign-in / sign-up / password-reset modes.

```html
<ht-login
  [authOptions]="{ email: true, google: true, github: true }"
  [showSimulationBadge]="true"
  (authResult)="onAuthResult($event)" />
```

**Inputs**
- `authOptions: AuthOptions` (required) — drives which SSO buttons and the email form are shown.
- `showSimulationBadge: boolean = true` — when in simulation mode and this is `true`, renders a `Simulation mode` badge (default styling meets WCAG AA contrast).

**Output**
- `authResult: EventEmitter<AuthResult>` — emits on every sign-in/up attempt (success or failure). Shape: `{ success, user, error?, isNewUser? }`.

**Styling hooks** (CSS custom properties on `:host`)
- `--ht-login-primary`, `--ht-login-secondary`, `--ht-login-error`, `--ht-login-success`
- `--ht-login-bg`, `--ht-login-text`
- `--ht-login-border-radius`, `--ht-login-font-family`, `--ht-login-spacing`
- `--ht-login-sim-badge-bg`, `--ht-login-sim-badge-fg`, `--ht-login-sim-badge-padding`, `--ht-login-sim-badge-radius`, `--ht-login-sim-badge-font-size`

---

## Guards

### `htAuthRedirectGuard` — `src/lib/auth/ht-auth-redirect.guard.ts`

Allows the route iff `HtAuthService.currentUser()` is truthy. Otherwise navigates to `data.redirectTo || '/'`.

```typescript
{
  path: 'dashboard',
  component: DashboardComponent,
  canActivate: [htAuthRedirectGuard],
  data: { redirectTo: '/login' }
}
```

### `htRoleGuard` — `src/lib/auth/ht-role.guard.ts`

Reads `Auth.currentUser`, fetches role from `users/{uid}` via `HtAuthAdminService`, allows if `userRole.role ∈ data.roles`.

```typescript
{
  path: 'admin',
  component: AdminComponent,
  canActivate: [htRoleGuard],
  data: { roles: ['admin'], redirectTo: '/unauthorized' }
}
```

### `createRoleGuard(roles, redirectTo='/')` — factory

```typescript
export const moderatorGuard = createRoleGuard(['admin', 'moderator'], '/login');
```

### `htAdminGuard` — pre-built `createRoleGuard(['admin'])`.

> The role guards rely on `inject(Auth)` and therefore on real Firebase being present. In simulation mode the real `Auth` provider is not registered for `auth === 'simulated'` services, so use these guards only in real-Firebase setups (or write your own sim-aware guard that consults `HtAuthService.currentUser()`).

---

## Simulation mode

Goal: every wrapper service has a working in-memory fallback so the same component code runs against either real Firebase or a local stub. Lets you develop UI without provisioning a Firebase project and write tests without mocking the SDK.

### Activation decision

Pure function `decideActivation({ config, isDevMode })` (not exported) runs synchronously inside `provideHtQuickNgxFire`. Output is `ActivationDecision`:

```typescript
interface ActivationDecision {
  services: Record<ServiceName, 'real' | 'simulated' | 'disabled'>;
  policyResolved: 'simulate' | 'throw';
  missingFieldsByService: Partial<Record<ServiceName, string[]>>;
  error: Error | null;
}
```

**Policy resolution table**

| `simulation` | `isDevMode` | Missing fields → |
|--------------|-------------|------------------|
| `'auto'` (default) | `true`  | simulate |
| `'auto'`           | `false` | **throw** `SimulationActivationError` |
| `'force'`          | any     | simulate |
| `'forbid'`         | any     | **throw** `SimulationActivationError` |

A service is `'disabled'` when its corresponding flag is `false` (or for `auth`, when no provider is set).

When the resolved policy is `simulate` and any service ends up simulated, `provideHtQuickNgxFire` emits **one** `console.warn` per unique decision per page session.

### What each Sim backend does

All `Sim*Backend` classes are `@Injectable()` (NOT `providedIn: 'root'`) — they're registered only when needed, keeping the simulation subtree tree-shakeable. Source: `src/lib/simulation/<service>/sim-<service>.backend.ts`.

| Backend | State | Highlights |
|---------|-------|-----------|
| `SimAuthBackend` | `BehaviorSubject<SimUser \| null>`, deterministic uid map | `signInWithEmail`, `createAccount`, `signInWithProvider`, `signOut`, `sendPasswordReset` (no-op). Same email → same `sim-uid-N` for the page session. Promises resolve via `queueMicrotask` so loading states stay observable. |
| `SimFirestoreBackend` | Nested `Map<path, Map<id, doc>>` + per-path `BehaviorSubject`s | Full read/write surface. Listeners fan out to changed collections + docs. `runTransaction` is single-pass atomic with one warning per session. Inline `applyQuery` supports `==`, `!=`, `<`, `<=`, `>`, `>=`, `orderBy`, `limit`. |
| `SimDatabaseBackend` | Nested object tree, listener fan-out on path **and ancestors** | `set`, `update`, `remove`, `push`, `onValue` (fires once on subscribe — `null` if absent, per real RTDB), `once`. Push keys are `sim-rtdb-N` scoped per parent. |
| `SimStorageBackend` | `Map<path, {blob, metadata, contentType}>` + `Map<path, blobURL>` | Uploads via `URL.createObjectURL`. URLs revoked on `ngOnDestroy` / overwrite / delete. Resumable upload returns a synthetic `UploadTask` that completes on the next microtask. |
| `SimFunctionsBackend` | `Map<name, handler>` | `httpsCallable(name)` returns a function that resolves `{ data: stub(payload) }` if registered, else `{ data: null }` with one warning per name. Register with `registerStub(name, handler)`. |

### Knobs you can use in tests

```typescript
const sim = TestBed.inject(SimFirestoreBackend); // available iff firestore was simulated
const fns = TestBed.inject(SimFunctionsBackend);
fns.registerStub('sendInvite', (payload) => ({ ok: true, id: 'abc' }));
```

### `SimulationStatusService`

```typescript
const status = inject(SimulationStatusService);
status.get('auth');          // 'real' | 'simulated' | 'disabled'
status.isAnySimulated;       // boolean
status.policyResolved;       // 'simulate' | 'throw'
status.services;             // ReadonlyMap<ServiceName, ServiceMode>
```

Default state (before bootstrap) is all `'real'`, so non-`provideHtQuickNgxFire` tests don't accidentally take the sim path.

---

## Recipes

### Show the current user reactively

```typescript
@Component({ /* … */ })
class HeaderComponent {
  private auth = inject(HtAuthService);
  user = this.auth.currentUser; // Signal<User | null>
}
```

```html
@if (user(); as u) {
  <span>{{ u.displayName ?? u.email }}</span>
  <button (click)="auth.signOut()">Sign out</button>
}
```

### List a collection

```typescript
private fs = inject(HtFirestoreService);
posts$ = this.fs.getCollectionData<Post>('posts'); // each item has `.id`
```

### Filtered query

```typescript
import { where, orderBy, limit } from '@angular/fire/firestore';

const q = this.fs.createQuery('posts', where('published', '==', true));
this.fs.getCollectionData<Post>(q).subscribe(rows => /* … */);
```

### Atomic update across two docs

```typescript
import { FireStoreBatchOperation } from 'ht-quick-ngxfire';

await this.fs.writeBatch([
  new FireStoreBatchOperation('update', `users/${uid}`,  { lastSeen: new Date() }),
  new FireStoreBatchOperation('set',    `sessions/${id}`, { uid, startedAt: new Date() }),
]);
```

### Upload with progress

```typescript
const url = await this.storage.uploadWithProgress(
  `uploads/${file.name}`,
  file,
  { contentType: file.type },
  (pct) => this.progress.set(pct),
);
```

### Invite + assign role

```typescript
const uid = await this.admin.inviteUserByEmail('new@example.com', 'moderator',
  ['edit:posts', 'delete:comments']);
```

### Force simulation for a Storybook / demo build

```typescript
provideHtQuickNgxFire({
  authOptions: { email: true, google: true },
  firestore: true, database: false, functions: false, storage: true,
  // No firebaseOptions, no Firebase project required.
  simulation: 'force',
})
```

### Stub a callable Function in tests

```typescript
TestBed.inject(SimFunctionsBackend).registerStub('chargeCard', () => ({ ok: true }));
```

---

## Error reference

| Class                       | `code`                          | When |
|-----------------------------|---------------------------------|------|
| `HtQuickNgxFireError`       | `invalid-path`                  | Empty path passed to a Firestore/Storage method. |
| `HtQuickNgxFireError`       | `firestore-unavailable`         | Called a Firestore method but the real provider wasn't registered (and not simulated). |
| `HtQuickNgxFireError`       | `storage-unavailable`           | As above for Storage. |
| `HtQuickNgxFireError`       | `auth-unavailable`              | As above for Auth (admin service). |
| `HtQuickNgxFireError`       | `auth/invalid-email`            | `SimAuthBackend` email validation. |
| `HtQuickNgxFireError`       | `auth/missing-password`         | `SimAuthBackend` password validation. |
| `HtQuickNgxFireError`       | `storage/object-not-found`      | `SimStorageBackend` read of unknown path. |
| `HtQuickNgxFireError`       | `no-user`                       | `HtAuthAdminService` op that needs a signed-in user. |
| `HtQuickNgxFireError`       | `no-role`                       | `updateUserPermissions` on a user without a role doc. |
| `HtQuickNgxFireError`       | `invalid-config`                | `decideActivation` received null/undefined config. |
| `HtQuickNgxFireError`       | `invalid-simulation-policy`     | `config.simulation` is not `'auto' \| 'force' \| 'forbid'`. |
| `HtQuickNgxFireError`       | `invalid-service-name`          | `SimulationStatusService.get(name)` with unknown name. |
| `SimulationActivationError` | `simulation-activation-blocked` | Resolved policy is `throw` and ≥1 enabled service is under-configured. Has `underConfigured: {service: missingFields[]}`. |

---

## File map

```
src/
  public-api.ts                                # Single export surface
  lib/
    ht-quick-ngxfire.providers.ts              # provideHtQuickNgxFire
    ht-quick-ngxfire.error.ts                  # HtQuickNgxFireError, SimulationActivationError
    firebase-config.model.ts                   # FirebaseConfig, AuthOptions
    auth/
      ht-auth.service.ts                       # HtAuthService (signals, sim-aware)
      ht-auth-admin.service.ts                 # HtAuthAdminService (roles/perms/profiles)
      ht-auth-user-sync.service.ts             # APP_INITIALIZER: auto-sync to users/{uid}
      ht-login.component.ts                    # <ht-login>
      auth-result.model.ts                     # AuthResult
      ht-role.guard.ts                         # htRoleGuard, htAdminGuard, createRoleGuard
      ht-auth-redirect.guard.ts                # htAuthRedirectGuard
    firestore/
      ht-quick-firestore.service.ts            # HtFirestoreService
      batch-operations.model.ts                # FireStoreBatchOperation
    storage/
      ht-storage.service.ts                    # HtStorageService
    simulation/
      simulation.types.ts                      # SimulationPolicy, ServiceName, ServiceMode, ActivationDecision
      activation.ts                            # decideActivation (internal)
      simulation-status.service.ts             # SimulationStatusService (read-only public)
      auth/sim-auth.backend.ts                 # SimAuthBackend
      firestore/sim-firestore.backend.ts       # SimFirestoreBackend, SimTransaction
      storage/sim-storage.backend.ts           # SimStorageBackend
      database/sim-database.backend.ts         # SimDatabaseBackend
      functions/sim-functions.backend.ts       # SimFunctionsBackend
```

---

## Build & test

From workspace root (never `cd projects/ht-quick-ngxfire`):

```bash
npm run build:ngxfire   # ng build ht-quick-ngxfire
npm run test:ngxfire    # ng test ht-quick-ngxfire --watch=false
```

Adjust to the actual scripts in workspace `package.json`. Library `peerDependencies` must be satisfied by the workspace `node_modules` — installing inside the library directory will reintroduce `NG0203`/`NG0402` injection-context errors.

---

## Notes for AI agents extending this library

1. **Don't add `providedIn: 'root'` to a new `Sim*` backend.** They must remain conditionally registered to keep `bundle - sim` under budget (FR-016).
2. **Every public Ht\* service must consult `SimulationStatusService` for its slice and route to the corresponding `Sim*Backend` when the slice is `'simulated'`.** Pattern: `this.simBackend = this.status.get('X') === 'simulated' ? inject(SimXBackend) : null;`
3. **Sim backends never throw "not supported".** If a real Firebase op has no obvious sim equivalent, no-op or return a sensible default (see `HtAuthAdminService.updateUserPassword`).
4. **`provideHtQuickNgxFire` skips `provideFirebaseApp(...)` entirely** when no service resolves to `'real'`, preserving the zero-network-call guarantee (FR-003).
5. **`decideActivation` is pure.** No `inject()`, no `console`, no I/O. If you need new side effects, add them in `provideHtQuickNgxFire`, not in `activation.ts`.
6. **Update `public-api.ts` for every new exported symbol.** Anything not exported there is internal — sim backends only expose the class for advanced test injection.
