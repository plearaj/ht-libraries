/**
 * Contract: simulator backend interfaces (E7..E11 in data-model.md).
 *
 * SPEC ARTIFACT — every Sim*Backend listed here is implemented as a plain
 * `@Injectable()` class (NOT `providedIn: 'root'`). The provider function
 * `provideHtQuickNgxFire` registers each backend conditionally — only when
 * the per-service activation decision resolves to `'simulated'` for that
 * service — keeping the simulation subtree tree-shakeable when no service
 * needs it. Each Ht*Service injects the paired backend and switches to it
 * at construction iff `SimulationStatusService.get('<service>') === 'simulated'`.
 * When the status reports simulated, the backend is guaranteed to be in
 * the injector (registered by the provider in the same call).
 *
 * The Sim*Backend method signatures MUST mirror the consumer-visible portion
 * of the corresponding Ht*Service so the Ht*Service body becomes a thin
 * delegating shell in simulation mode.
 */

import type { Observable } from 'rxjs';
import type {
  User,
  UserCredential,
} from '@angular/fire/auth';
import type {
  DocumentData,
  FirestoreDataConverter,
  Query,
  Transaction,
  CollectionReference,
} from '@angular/fire/firestore';
import type { FireStoreBatchOperation } from '../../../projects/ht-quick-ngxfire/src/lib/firestore/batch-operations.model';

// ─────────────────────────────────────────────────────────────────────────────
// E7. SimAuthBackend — backs HtAuthService in simulation
// ─────────────────────────────────────────────────────────────────────────────

export interface SimAuthBackend {
  /** Drives HtAuthService.user$ and (via toSignal) HtAuthService.currentUser. */
  readonly user$: Observable<User | null>;

  signInWithEmail(email: string, password: string): Promise<UserCredential>;
  createAccount(email: string, password: string): Promise<UserCredential>;

  /**
   * `preferRedirect` honored in shape only — the simulator has no popup to
   * block, so the resulting UserCredential is identical regardless.
   */
  signInWithProvider(
    providerId: string,
    preferRedirect?: boolean,
  ): Promise<UserCredential>;

  signOut(): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// E8. SimFirestoreBackend — backs HtFirestoreService, HtAuthAdminService,
//                           and HtAuthUserSyncService in simulation (R10)
// ─────────────────────────────────────────────────────────────────────────────

export interface SimFirestoreBackend {
  // ── Reference construction (mirrors HtFirestoreService) ──
  createCollectionRef(
    path: string,
    converter?: FirestoreDataConverter<DocumentData, DocumentData>,
  ): CollectionReference<DocumentData, DocumentData>;
  getCollectionRef(path: string): CollectionReference<DocumentData, DocumentData>;
  createDocRef(path: string, id: string): unknown; // mirrors `DocumentReference` shape
  createQuery(path: string, ...args: unknown[]): Query;
  createCollectionGroupQuery(collectionId: string, ...constraints: unknown[]): Query;

  // ── Reads ──
  getCollectionData<T>(pathOrQuery: string | Query, passId?: boolean): Observable<T[]>;
  getCollectionSnapshots<T>(query: Query): Observable<T[]>;
  getDocData(
    path: string,
    converter?: FirestoreDataConverter<DocumentData, DocumentData>,
    passId?: boolean,
  ): Observable<unknown>;
  getDocSnapshots(
    path: string,
    converter?: FirestoreDataConverter<DocumentData, DocumentData>,
  ): Observable<unknown>;

  // ── Writes ──
  addDoc(path: string, data: Record<string, unknown>): Promise<unknown>;
  setDoc(docPath: string, data: Record<string, unknown>): Promise<void>;
  updateDoc(docPath: string, data: Record<string, unknown>): Promise<void>;
  deleteDoc(docPath: string): Promise<void>;

  // ── Aggregation ──
  getCountFromServer(q: string | Query<DocumentData, DocumentData>): Promise<number>;

  // ── Batched / transactional ──
  writeBatch(writes: FireStoreBatchOperation[]): Promise<void>;

  /**
   * Single-pass atomic transaction (FR-010a). Callback runs exactly once
   * against a consistent snapshot; commits atomically. No version tracking,
   * no retries, no contention emulation. First call per page session emits
   * a one-time `console.warn` naming this limitation.
   */
  runTransaction<T>(updateFn: (transaction: Transaction) => Promise<T>): Promise<T>;
}

// ─────────────────────────────────────────────────────────────────────────────
// E9. SimStorageBackend — backs HtStorageService in simulation
// ─────────────────────────────────────────────────────────────────────────────

export interface SimStorageBackend {
  /**
   * Returns an UploadTask-shaped object whose progress observable emits one
   * synthetic progress event followed by the success state on the next
   * microtask. `.snapshot.ref.fullPath` matches the input path.
   */
  upload(
    path: string,
    blob: Blob,
    metadata?: Record<string, unknown>,
  ): unknown;

  /** Returns a blob URL valid for the page session. */
  getDownloadURL(path: string): Promise<string>;

  getMetadata(path: string): Promise<Record<string, unknown>>;
  updateMetadata(path: string, partial: Record<string, unknown>): Promise<void>;
  delete(path: string): Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// E10. SimDatabaseBackend — Realtime Database simulator
// ─────────────────────────────────────────────────────────────────────────────

export interface SimDatabaseBackend {
  set(path: string, value: unknown): Promise<void>;
  update(path: string, partial: Record<string, unknown>): Promise<void>;
  remove(path: string): Promise<void>;

  /** Returns a synthesized push key based on an incrementing counter. */
  push(path: string, value: unknown): Promise<{ key: string }>;

  /** Subscribe to a path; callback fires on subscribe and on every descendant write. */
  onValue(path: string, callback: (value: unknown) => void): () => void;

  /** One-shot read. */
  once(path: string): Promise<unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// E11. SimFunctionsBackend — Cloud Functions simulator (R3)
// ─────────────────────────────────────────────────────────────────────────────

export interface SimFunctionsBackend {
  /**
   * Returns a callable. If a stub for `name` was registered, runs it with
   * the payload; otherwise resolves with `{ data: null }` and emits one
   * `console.warn` per unregistered name per page session.
   */
  httpsCallable<TPayload = unknown, TResult = unknown>(
    name: string,
  ): (payload: TPayload) => Promise<{ data: TResult | null }>;

  /**
   * Register a per-callable handler. Subsequent calls to httpsCallable(name)
   * route through this handler. Public so consumers can seed demo data and
   * tests can set up per-test scenarios.
   */
  registerStub(
    name: string,
    handler: (payload: unknown) => unknown | Promise<unknown>,
  ): void;

  /** Clear all registered stubs. Public for per-test isolation. */
  clearStubs(): void;
}
