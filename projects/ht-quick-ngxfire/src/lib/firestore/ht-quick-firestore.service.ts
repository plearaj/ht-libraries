import { inject, Injectable, Injector, runInInjectionContext } from "@angular/core";
import { Firestore } from "@angular/fire/firestore";
import { CollectionReference, FirestoreDataConverter, QueryDocumentSnapshot, DocumentData, collection, doc, QueryConstraint, QueryNonFilterConstraint, QueryCompositeFilterConstraint, collectionData, collectionSnapshots, docData, docSnapshots, addDoc, updateDoc, setDoc, deleteDoc, writeBatch, AggregateQuerySnapshot, AggregateField, getCountFromServer, Query, query, runTransaction, collectionGroup, Transaction } from "@angular/fire/firestore";
import { Observable } from "rxjs";
import { FireStoreBatchOperation } from "./batch-operations.model";
import { HtQuickNgxFireError } from "../ht-quick-ngxfire.error";

/**
 * A wrapper service for Firestore operations that simplifies common CRUD tasks
 * and handles injection context requirements for AngularFire observables.
 *
 * @example
 * ```typescript
 * const firestore = inject(HtFirestoreService);
 * // Get all documents from a collection
 * const users$ = firestore.getCollectionData<User>('users');
 * // Get a single document
 * const user$ = firestore.getDocData('users/abc123');
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class HtFirestoreService {
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(Injector);
  private collectionRefs = new Map<string, CollectionReference>();

  constructor() {
    // intentionally empty — service is injectable via providedIn: 'root'
  }

  /**
   * Creates and caches a Firestore collection reference.
   *
   * @param path - The Firestore collection path (e.g., `'users'` or `'companies/abc/employees'`).
   * @param converter - Optional Firestore data converter for type-safe reads/writes.
   * @returns The created `CollectionReference`.
   * @throws HtQuickNgxFireError if `path` is an empty string.
   *
   * @example
   * ```typescript
   * // Simple collection reference
   * const usersRef = firestore.createCollectionRef('users');
   *
   * // With a custom converter
   * const converter: FirestoreDataConverter<User> = { ... };
   * const typedRef = firestore.createCollectionRef('users', converter);
   * ```
   */
  // AngularFire's FirestoreDataConverter requires two type params; second defaults to DocumentData
  createCollectionRef(path: string, converter?: FirestoreDataConverter<DocumentData, DocumentData>) {
    if (path === '') throw new HtQuickNgxFireError('Path cannot be empty', 'invalid-path');
    let collectionRef: CollectionReference<DocumentData, DocumentData>;
    if (converter) {
      collectionRef = collection(this.firestore, path).withConverter(converter);
    } else {
      collectionRef = collection(this.firestore, path).withConverter(null);
    }
    this.collectionRefs.set(path, collectionRef);
    return collectionRef;
  }

  /**
   * Retrieves a cached collection reference, or creates a new one if not found.
   *
   * @param path - The Firestore collection path.
   * @returns The cached or newly created `CollectionReference`.
   * @throws HtQuickNgxFireError if `path` is an empty string.
   *
   * @example
   * ```typescript
   * const usersRef = firestore.getCollectionRef('users');
   * ```
   */
  getCollectionRef(path: string) {
    if (path === '') throw new HtQuickNgxFireError('Path cannot be empty', 'invalid-path');
    let collectionRef: CollectionReference<DocumentData, DocumentData>;
    if (this.collectionRefs.has(path)) {
      collectionRef = this.collectionRefs.get(path) as CollectionReference<DocumentData, DocumentData>;
    } else {
      collectionRef = this.createCollectionRef(path)
    }
    return collectionRef;
  }

  /**
   * Creates a document reference for a specific document in a collection.
   *
   * @param path - The Firestore collection path.
   * @param id - The document ID.
   * @returns A `DocumentReference` pointing to `{path}/{id}`.
   * @throws HtQuickNgxFireError if `path` is an empty string.
   *
   * @example
   * ```typescript
   * const userDocRef = firestore.createDocRef('users', 'abc123');
   * ```
   */
  createDocRef(path: string, id: string) {
    if (path === '') throw new HtQuickNgxFireError('Path cannot be empty', 'invalid-path');
    return doc(this.firestore, `${path}/${id}`);
  }

  /**
   * Creates a Firestore query on a collection.
   *
   * Supports multiple overloads:
   * - No constraints: returns all documents.
   * - With `QueryConstraint`: applies a single filter/order/limit.
   * - With composite filter and non-filter constraints: combines both.
   *
   * @param path - The Firestore collection path.
   * @param queryConstraints - Optional query constraint (e.g., `where()`, `orderBy()`, `limit()`).
   * @param compositeFilter - Optional composite filter (e.g., `and()`, `or()`).
   * @returns A Firestore `Query` object.
   * @throws HtQuickNgxFireError if `path` is an empty string.
   *
   * @example
   * ```typescript
   * // All documents
   * const allQuery = firestore.createQuery('users');
   *
   * // With a single constraint
   * const activeQuery = firestore.createQuery('users', where('active', '==', true));
   *
   * // With composite filter and ordering
   * const complexQuery = firestore.createQuery(
   *   'users',
   *   orderBy('createdAt', 'desc'),
   *   and(where('active', '==', true), where('role', '==', 'admin'))
   * );
   * ```
   */
  createQuery(path: string): Query
  createQuery(path: string, queryConstraints: QueryConstraint): Query
  createQuery(path: string, queryConstraints: QueryNonFilterConstraint, compositeFilter: QueryCompositeFilterConstraint): Query
  createQuery(path: string, queryConstraints: undefined, compositeFilter: QueryCompositeFilterConstraint): Query
  createQuery(path: string, queryConstraints?: QueryConstraint | QueryNonFilterConstraint, compositeFilter?: QueryCompositeFilterConstraint): Query {
    if (path === '') throw new HtQuickNgxFireError('Path cannot be empty', 'invalid-path');
    const collectionRef = this.getCollectionRef(path);
    if (queryConstraints instanceof QueryConstraint) {
      return query(collectionRef, queryConstraints);
    } else if (queryConstraints && compositeFilter) {
      return query(collectionRef, compositeFilter, queryConstraints);
    } else if (compositeFilter) {
      return query(collectionRef, compositeFilter);
    }
    return query(collectionRef);
  }

  /**
   * Creates a Firestore query on a collection group.
   *
   * @param collectionId - The ID of the collection group to query.
   * @param queryConstraints - Optional query constraints.
   * @returns A Firestore `Query` object.
   *
   * @example
   * ```typescript
   * // Query all documents in the 'reviews' collection group
   * const allReviewsQuery = firestore.createCollectionGroupQuery('reviews');
   *
   * // Query all documents in the 'reviews' collection group where the rating is 5
   * const topRatedReviewsQuery = firestore.createCollectionGroupQuery('reviews', where('rating', '==', 5));
   * ```
   */
  createCollectionGroupQuery(collectionId: string, ...queryConstraints: QueryConstraint[]): Query {
    const group = collectionGroup(this.firestore, collectionId);
    return query(group, ...queryConstraints);
  }

  /**
   * Returns an observable stream of documents from a collection or query.
   *
   * @typeParam T - The expected document type.
   * @param pathOrQuery - Either a collection path string or a Firestore `Query` object.
   * @param passId - If `true` (default), includes the document ID as an `id` field on each object.
   * @returns An `Observable<T[]>` that emits whenever the collection changes.
   * @throws HtQuickNgxFireError if a string path is provided and is empty.
   *
   * @example
   * ```typescript
   * // From a path
   * const users$ = firestore.getCollectionData<User>('users');
   *
   * // From a query
   * const q = firestore.createQuery('users', where('active', '==', true));
   * const activeUsers$ = firestore.getCollectionData<User>(q);
   *
   * // Without including the document ID
   * const usersNoId$ = firestore.getCollectionData<User>('users', false);
   * ```
   */
  getCollectionData<T>(path: string, passId?: boolean): Observable<T[]>
  getCollectionData<T>(query: Query<DocumentData, DocumentData>, passId?: boolean): Observable<T[]>
  getCollectionData<T>(pathOrQuery: string | Query<DocumentData, DocumentData>, passId: boolean = true): Observable<T[]> {
    let idField: string | undefined = 'id';
    if (!passId) idField = undefined;

    let targetRef: CollectionReference | Query;

    if (typeof pathOrQuery === 'string') {
      if (pathOrQuery === '') throw new HtQuickNgxFireError('Path cannot be empty', 'invalid-path');
      targetRef = this.getCollectionRef(pathOrQuery);
    } else {
      targetRef = pathOrQuery;
    }

    return runInInjectionContext(this.injector, () =>
      collectionData(targetRef, {idField})
    ) as Observable<T[]>;
  }

  /**
   * Returns an observable stream of document snapshots from a query.
   *
   * Use this when you need access to snapshot metadata (e.g., `exists`, `metadata.fromCache`).
   *
   * @typeParam T - The expected snapshot type.
   * @param query - A Firestore `Query` object.
   * @returns An `Observable<T[]>` emitting `QueryDocumentSnapshot` arrays.
   *
   * @example
   * ```typescript
   * const q = firestore.createQuery('users', where('role', '==', 'admin'));
   * const snapshots$ = firestore.getCollectionSnapshots<QueryDocumentSnapshot<User>>(q);
   * snapshots$.subscribe(snaps => {
   *   snaps.forEach(snap => console.log(snap.id, snap.data()));
   * });
   * ```
   */
  getCollectionSnapshots<T>(query: Query) {
    const snapshots = runInInjectionContext(this.injector, () =>
      collectionSnapshots(query)
    );
    return snapshots as Observable<T[]>;
  }

  /**
   * Returns an observable stream of a single document's data.
   *
   * @param path - The full document path (e.g., `'users/abc123'`).
   * @param converter - Optional Firestore data converter.
   * @param passId - If `true` (default), includes the document ID as an `id` field.
   * @returns An `Observable` emitting the document data, or `undefined` if it doesn't exist.
   *
   * @example
   * ```typescript
   * const user$ = firestore.getDocData('users/abc123');
   * user$.subscribe(user => console.log(user));
   * ```
   */
  getDocData(path: string, converter?: FirestoreDataConverter<DocumentData, DocumentData>, passId: boolean = true) {
    let documentRef = doc(this.firestore, path).withConverter(null);
    if (converter) {
      documentRef = doc(this.firestore, path).withConverter(converter);
    }
    let idField: string | undefined = 'id';
    if (!passId) idField = undefined;
    return runInInjectionContext(this.injector, () =>
      docData(documentRef, {idField})
    );
  }

  /**
   * Returns an observable stream of a single document's snapshot.
   *
   * Use this when you need access to snapshot metadata (e.g., `exists`, `metadata`).
   *
   * @param path - The full document path (e.g., `'users/abc123'`).
   * @param converter - Optional Firestore data converter.
   * @param passId - Currently unused but kept for API consistency.
   * @returns An `Observable` emitting `DocumentSnapshot` objects.
   *
   * @example
   * ```typescript
   * const userSnap$ = firestore.getDocSnapshots('users/abc123');
   * userSnap$.subscribe(snap => {
   *   if (snap.exists()) {
   *     console.log(snap.data());
   *   }
   * });
   * ```
   */
  getDocSnapshots(path: string, converter?: FirestoreDataConverter<DocumentData, DocumentData>, passId: boolean = true) {
    let documentRef = doc(this.firestore, path).withConverter(null);
    if (converter) {
      documentRef = doc(this.firestore, path).withConverter(converter);
    }
    return runInInjectionContext(this.injector, () =>
      docSnapshots(documentRef)
    );
  }

  /**
   * Adds a new document to a collection with an auto-generated ID.
   *
   * @param path - The Firestore collection path.
   * @param data - The document data to write.
   * @returns A `Promise` resolving to the new `DocumentReference`.
   * @throws HtQuickNgxFireError if `path` is an empty string.
   *
   * @example
   * ```typescript
   * const docRef = await firestore.addDoc('users', { name: 'Alice', email: 'alice@example.com' });
   * console.log('Created document with ID:', docRef.id);
   * ```
   */
  addDoc(path: string, data: Record<string, unknown>) {
    if (path === '') throw new HtQuickNgxFireError('Path cannot be empty', 'invalid-path');
    const collectionRef = this.getCollectionRef(path);
    return addDoc(collectionRef, data);
  }

  /**
   * Updates specific fields of an existing document.
   *
   * Only the fields provided in `data` are updated; other fields remain unchanged.
   *
   * @param docPath - The full document path (e.g., `'users/abc123'`).
   * @param data - An object containing the fields to update.
   * @returns A `Promise` that resolves when the update completes.
   *
   * @example
   * ```typescript
   * await firestore.updateDoc('users/abc123', { displayName: 'Alice Smith' });
   * ```
   */
  updateDoc(docPath: string, data: Record<string, unknown>) {
    const docRef = doc(this.firestore, docPath);
    return updateDoc(docRef, data)
  }

  /**
   * Creates or overwrites a document at the specified path.
   *
   * If the document exists, it will be completely replaced with the new data.
   *
   * @param docPath - The full document path (e.g., `'users/abc123'`).
   * @param data - The document data to write.
   * @returns A `Promise` that resolves when the write completes.
   *
   * @example
   * ```typescript
   * await firestore.setDoc('users/abc123', { name: 'Alice', email: 'alice@example.com' });
   * ```
   */
  setDoc(docPath: string, data: Record<string, unknown>) {
    const docRef = doc(this.firestore, docPath);
    return setDoc(docRef, data);
  }

  /**
   * Deletes a document from Firestore.
   *
   * @param docPath - The full document path (e.g., `'users/abc123'`).
   * @returns A `Promise` that resolves when the delete completes.
   *
   * @example
   * ```typescript
   * await firestore.deleteDoc('users/abc123');
   * ```
   */
  deleteDoc(docPath: string) {
    const docRef = doc(this.firestore, docPath);
    return deleteDoc(docRef)
  }

  /**
   * Executes multiple write operations atomically in a single batch.
   *
   * All operations succeed or fail together. Batches are limited to 500 operations.
   *
   * @param writes - An array of `FireStoreBatchOperation` objects specifying set/update/delete operations.
   * @returns A `Promise` that resolves when the batch commits successfully.
   *
   * @example
   * ```typescript
   * const userRef = firestore.createDocRef('users', 'abc123');
   * const logRef = firestore.createDocRef('logs', 'log1');
   *
   * await firestore.writeBatch([
   *   { operation: 'update', docRef: userRef, data: { updatedAt: new Date() } },
   *   { operation: 'set', docRef: logRef, data: { action: 'user_updated', timestamp: new Date() } }
   * ]);
   * ```
   */
  writeBatch(writes: FireStoreBatchOperation[]) {
    const batch = writeBatch(this.firestore);
    writes.forEach(write => {
      if (write.operation === 'set') {
        batch.set(write.docRef, write.data)
      } else if (write.operation === 'update') {
        batch.update(write.docRef, write.data)
      } else {
        batch.delete(write.docRef)
      }
    });
    return batch.commit();
  }

  /**
   * Executes a transaction, which is a set of read and write operations that
   * succeed or fail together.
   *
   * Use transactions to perform atomic read-modify-write operations.
   *
   * @param updateFunction A function that receives the transaction object and returns a promise.
   * @returns A `Promise` that resolves with the value returned by the updateFunction.
   *
   * @example
   * ```typescript
   * await firestore.runTransaction(async (transaction) => {
   *   const docRef = firestore.createDocRef('users', 'abc123');
   *   const docSnap = await transaction.get(docRef);
   *   if (docSnap.exists()) {
   *     const newBalance = docSnap.data().balance + 10;
   *     transaction.update(docRef, { balance: newBalance });
   *   }
   * });
   * ```
   */
  runTransaction<T>(updateFunction: (transaction: Transaction) => Promise<T>) {
    return runTransaction(this.firestore, updateFunction);
  }

  /**
   * Gets the count of documents matching a query or in a collection, computed on the server.
   *
   * This is more efficient than fetching all documents when you only need the count.
   *
   * @param q - Either a collection path string or a Firestore `Query` object.
   * @returns A `Promise` resolving to the document count.
   * @throws HtQuickNgxFireError if a string path is provided and is empty.
   *
   * @example
   * ```typescript
   * // Count all users
   * const totalUsers = await firestore.getCountFromServer('users');
   *
   * // Count with a query
   * const activeQuery = firestore.createQuery('users', where('active', '==', true));
   * const activeCount = await firestore.getCountFromServer(activeQuery);
   * ```
   */
  async getCountFromServer(q: Query<DocumentData, DocumentData> | string) {
    let snapshot: AggregateQuerySnapshot<{count: AggregateField<number>}, DocumentData, DocumentData>;
    if (typeof q === 'string') {
      if (q === '') throw new HtQuickNgxFireError('Path cannot be empty', 'invalid-path');
      const collectionRef = this.getCollectionRef(q);
      snapshot = await getCountFromServer(collectionRef);
    } else {
      snapshot = await getCountFromServer(q);
    }
    return snapshot.data().count;
  }
}
