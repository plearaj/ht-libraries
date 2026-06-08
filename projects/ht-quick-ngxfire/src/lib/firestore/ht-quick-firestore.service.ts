import { inject, Injectable, Injector, runInInjectionContext } from "@angular/core";
import { Firestore } from "@angular/fire/firestore";
import { CollectionReference, FirestoreDataConverter, DocumentData, collection, doc, QueryConstraint, QueryNonFilterConstraint, QueryCompositeFilterConstraint, collectionData, collectionSnapshots, docData, docSnapshots, addDoc, updateDoc, setDoc, deleteDoc, writeBatch, AggregateQuerySnapshot, AggregateField, getCountFromServer, Query, query, runTransaction, collectionGroup, Transaction } from "@angular/fire/firestore";
import { Observable, firstValueFrom } from "rxjs";
import { FireStoreBatchOperation } from "./batch-operations.model";
import { HtQuickNgxFireError } from "../ht-quick-ngxfire.error";
import { SimulationStatusService } from "../simulation/simulation-status.service";
import { SimFirestoreBackend, SimTransaction } from "../simulation/firestore/sim-firestore.backend";

/**
 * Sim-mode reference stub: a path-keyed marker the wrapper service uses to
 * route into `SimFirestoreBackend`. Type-asserted to the AngularFire types
 * at the API boundary; consumers should treat it as opaque.
 */
interface SimRef {
  __sim: true;
  path: string;
  collection?: string;
}

function isSimRef(x: unknown): x is SimRef {
  return typeof x === 'object' && x !== null && (x as SimRef).__sim === true;
}

@Injectable({
  providedIn: 'root'
})
export class HtFirestoreService {
  private status = inject(SimulationStatusService);
  private isSim = this.status.get('firestore') === 'simulated';
  private simBackend = this.isSim ? inject(SimFirestoreBackend) : null;

  private readonly firestore = inject(Firestore, { optional: true });
  private readonly injector = inject(Injector);
  private collectionRefs = new Map<string, CollectionReference>();

  // ── Reference construction ──

  createCollectionRef(path: string, converter?: FirestoreDataConverter<DocumentData, DocumentData>) {
    if (path === '') throw new HtQuickNgxFireError('Path cannot be empty', 'invalid-path');
    if (this.isSim) {
      return ({ __sim: true, path } as unknown) as CollectionReference<DocumentData, DocumentData>;
    }
    if (!this.firestore) throw new HtQuickNgxFireError('Firestore is not available', 'firestore-unavailable');
    let collectionRef: CollectionReference<DocumentData, DocumentData>;
    if (converter) {
      collectionRef = collection(this.firestore, path).withConverter(converter);
    } else {
      collectionRef = collection(this.firestore, path).withConverter(null);
    }
    this.collectionRefs.set(path, collectionRef);
    return collectionRef;
  }

  getCollectionRef(path: string) {
    if (path === '') throw new HtQuickNgxFireError('Path cannot be empty', 'invalid-path');
    if (this.isSim) {
      return ({ __sim: true, path } as unknown) as CollectionReference<DocumentData, DocumentData>;
    }
    if (this.collectionRefs.has(path)) {
      return this.collectionRefs.get(path) as CollectionReference<DocumentData, DocumentData>;
    }
    return this.createCollectionRef(path);
  }

  createDocRef(path: string, id: string) {
    if (path === '') throw new HtQuickNgxFireError('Path cannot be empty', 'invalid-path');
    if (this.isSim) {
      return ({ __sim: true, path: `${path}/${id}`, collection: path } as unknown) as ReturnType<typeof doc>;
    }
    if (!this.firestore) throw new HtQuickNgxFireError('Firestore is not available', 'firestore-unavailable');
    return doc(this.firestore, `${path}/${id}`);
  }

  createQuery(path: string): Query;
  createQuery(path: string, queryConstraints: QueryConstraint): Query;
  createQuery(path: string, queryConstraints: QueryNonFilterConstraint, compositeFilter: QueryCompositeFilterConstraint): Query;
  createQuery(path: string, queryConstraints: undefined, compositeFilter: QueryCompositeFilterConstraint): Query;
  createQuery(path: string, queryConstraints?: QueryConstraint | QueryNonFilterConstraint, compositeFilter?: QueryCompositeFilterConstraint): Query {
    if (path === '') throw new HtQuickNgxFireError('Path cannot be empty', 'invalid-path');
    if (this.isSim) {
      // Simulator query: return the path-keyed stub; query constraints are
      // ignored in this simplified implementation — consumers needing query
      // semantics should use the real path or extend SimFirestoreBackend.
      return ({ __sim: true, path } as unknown) as Query;
    }
    if (!this.firestore) throw new HtQuickNgxFireError('Firestore is not available', 'firestore-unavailable');
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

  createCollectionGroupQuery(collectionId: string, ...queryConstraints: QueryConstraint[]): Query {
    if (this.isSim) {
      return ({ __sim: true, path: collectionId } as unknown) as Query;
    }
    if (!this.firestore) throw new HtQuickNgxFireError('Firestore is not available', 'firestore-unavailable');
    const group = collectionGroup(this.firestore, collectionId);
    return query(group, ...queryConstraints);
  }

  // ── Reads ──

  getCollectionData<T>(path: string, passId?: boolean): Observable<T[]>;
  getCollectionData<T>(query: Query<DocumentData, DocumentData>, passId?: boolean): Observable<T[]>;
  getCollectionData<T>(pathOrQuery: string | Query<DocumentData, DocumentData>, passId = true): Observable<T[]> {
    const path = this.resolvePath(pathOrQuery);
    if (this.simBackend) return this.simBackend.getCollectionData<T>(path, passId);
    if (!this.firestore) throw new HtQuickNgxFireError('Firestore is not available', 'firestore-unavailable');
    let idField: string | undefined = 'id';
    if (!passId) idField = undefined;
    let targetRef: CollectionReference | Query;
    if (typeof pathOrQuery === 'string') {
      if (pathOrQuery === '') throw new HtQuickNgxFireError('Path cannot be empty', 'invalid-path');
      targetRef = this.getCollectionRef(pathOrQuery);
    } else {
      targetRef = pathOrQuery;
    }
    return runInInjectionContext(this.injector, () => collectionData(targetRef, { idField })) as Observable<T[]>;
  }

  getCollectionSnapshots<T>(query: Query) {
    if (this.simBackend) {
      // Approximate: emit data wrapped as `{ id, data: () => doc, exists: () => true }`-shaped objects.
      const path = this.resolvePath(query);
      return this.simBackend.getCollectionData<T>(path).pipe() as unknown as Observable<T[]>;
    }
    if (!this.firestore) throw new HtQuickNgxFireError('Firestore is not available', 'firestore-unavailable');
    const snapshots = runInInjectionContext(this.injector, () => collectionSnapshots(query));
    return snapshots as Observable<T[]>;
  }

  getDocData(path: string, converter?: FirestoreDataConverter<DocumentData, DocumentData>, passId = true) {
    if (this.simBackend) return this.simBackend.getDocData(path, passId);
    if (!this.firestore) throw new HtQuickNgxFireError('Firestore is not available', 'firestore-unavailable');
    let documentRef = doc(this.firestore, path).withConverter(null);
    if (converter) documentRef = doc(this.firestore, path).withConverter(converter);
    let idField: string | undefined = 'id';
    if (!passId) idField = undefined;
    return runInInjectionContext(this.injector, () => docData(documentRef, { idField }));
  }

  getDocSnapshots(path: string, converter?: FirestoreDataConverter<DocumentData, DocumentData>, _passId = true) {
    if (this.simBackend) return this.simBackend.getDocData(path) as unknown as Observable<unknown>;
    if (!this.firestore) throw new HtQuickNgxFireError('Firestore is not available', 'firestore-unavailable');
    let documentRef = doc(this.firestore, path).withConverter(null);
    if (converter) documentRef = doc(this.firestore, path).withConverter(converter);
    return runInInjectionContext(this.injector, () => docSnapshots(documentRef));
  }

  // ── Writes ──

  addDoc(path: string, data: Record<string, unknown>) {
    if (path === '') throw new HtQuickNgxFireError('Path cannot be empty', 'invalid-path');
    if (this.simBackend) return this.simBackend.addDoc(path, data);
    if (!this.firestore) throw new HtQuickNgxFireError('Firestore is not available', 'firestore-unavailable');
    const collectionRef = this.getCollectionRef(path);
    return runInInjectionContext(this.injector, () => addDoc(collectionRef, data));
  }

  updateDoc(docPath: string, data: Record<string, unknown>) {
    if (this.simBackend) return this.simBackend.updateDoc(docPath, data);
    if (!this.firestore) throw new HtQuickNgxFireError('Firestore is not available', 'firestore-unavailable');
    const docRef = doc(this.firestore, docPath);
    return runInInjectionContext(this.injector, () => updateDoc(docRef, data));
  }

  setDoc(docPath: string, data: Record<string, unknown>) {
    if (this.simBackend) return this.simBackend.setDoc(docPath, data);
    if (!this.firestore) throw new HtQuickNgxFireError('Firestore is not available', 'firestore-unavailable');
    const docRef = doc(this.firestore, docPath);
    return runInInjectionContext(this.injector, () => setDoc(docRef, data));
  }

  deleteDoc(docPath: string) {
    if (this.simBackend) return this.simBackend.deleteDoc(docPath);
    if (!this.firestore) throw new HtQuickNgxFireError('Firestore is not available', 'firestore-unavailable');
    const docRef = doc(this.firestore, docPath);
    return runInInjectionContext(this.injector, () => deleteDoc(docRef));
  }

  writeBatch(writes: FireStoreBatchOperation[]) {
    if (this.simBackend) {
      const ops = writes.map((w) => ({
        kind: w.operation,
        docPath: w.docPath,
        data: w.data,
      }));
      return this.simBackend.writeBatch(ops);
    }
    if (!this.firestore) throw new HtQuickNgxFireError('Firestore is not available', 'firestore-unavailable');
    return runInInjectionContext(this.injector, () => {
      const batch = writeBatch(this.firestore!);
      writes.forEach((write) => {
        const docRef = doc(this.firestore!, write.docPath);
        if (write.operation === 'set') batch.set(docRef, write.data ?? {});
        else if (write.operation === 'update') batch.update(docRef, write.data ?? {});
        else batch.delete(docRef);
      });
      return batch.commit();
    });
  }

  runTransaction<T>(updateFunction: (transaction: Transaction) => Promise<T>) {
    if (this.simBackend) {
      return this.simBackend.runTransaction((tx: SimTransaction) =>
        updateFunction(tx as unknown as Transaction),
      );
    }
    if (!this.firestore) throw new HtQuickNgxFireError('Firestore is not available', 'firestore-unavailable');
    return runInInjectionContext(this.injector, () => runTransaction(this.firestore!, updateFunction));
  }

  async getCountFromServer(q: Query<DocumentData, DocumentData> | string) {
    if (this.simBackend) {
      const path = typeof q === 'string' ? q : this.resolvePath(q);
      return this.simBackend.getCountFromServer(path);
    }
    if (!this.firestore) throw new HtQuickNgxFireError('Firestore is not available', 'firestore-unavailable');
    let snapshot: AggregateQuerySnapshot<{ count: AggregateField<number> }, DocumentData, DocumentData>;
    if (typeof q === 'string') {
      if (q === '') throw new HtQuickNgxFireError('Path cannot be empty', 'invalid-path');
      const collectionRef = this.getCollectionRef(q);
      snapshot = await runInInjectionContext(this.injector, () => getCountFromServer(collectionRef));
    } else {
      snapshot = await runInInjectionContext(this.injector, () => getCountFromServer(q));
    }
    return snapshot.data().count;
  }

  // ── Internals ──

  private resolvePath(pathOrQueryOrRef: unknown): string {
    if (typeof pathOrQueryOrRef === 'string') return pathOrQueryOrRef;
    if (isSimRef(pathOrQueryOrRef)) return pathOrQueryOrRef.path;
    const maybe = pathOrQueryOrRef as { path?: string };
    if (maybe && typeof maybe.path === 'string') return maybe.path;
    throw new HtQuickNgxFireError('Cannot resolve Firestore path from input', 'invalid-path');
  }

  // Compatibility helper used by HtAuthAdminService / batch operations.
  // Avoids unused-import warnings for firstValueFrom.
  protected async _await<T>(o: Observable<T>): Promise<T> {
    return firstValueFrom(o);
  }
}
