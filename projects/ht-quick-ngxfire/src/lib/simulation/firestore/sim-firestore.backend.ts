import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HtQuickNgxFireError } from '../../ht-quick-ngxfire.error';

/**
 * SimFirestoreBackend — in-memory document store backing HtFirestoreService,
 * HtAuthAdminService, and HtAuthUserSyncService in simulation (R10).
 *
 * Plain `@Injectable()` — registered conditionally per L4 / T009.
 * State resets on page reload (FR-014).
 *
 * Cross-references:
 *   - Edge Cases "Real-time listeners": shared listener bus per path; writes
 *     from one call site fan out to all listeners on the path or its parents.
 *   - FR-010a: `runTransaction` is single-pass atomic with a one-time warning.
 *   - T013 per-collection-path docId counter (avoids cross-collection collisions).
 */

export type SimDoc = Record<string, unknown>;

interface SimQueryFilter {
  field: string;
  op: '==' | '!=' | '<' | '<=' | '>' | '>=';
  value: unknown;
}

export interface SimQuery {
  collectionPath: string;
  filters: SimQueryFilter[];
  orderBy: { field: string; direction: 'asc' | 'desc' }[];
  limit: number | null;
}

const TX_WARNING =
  '[ht-quick-ngxfire] runTransaction simulation note: transactions run callback once atomically. ' +
  'No version tracking or contention emulation. Validate transaction-bound code against real Firestore or the Firebase Local Emulator Suite (FR-010a).';

@Injectable()
export class SimFirestoreBackend {
  /** Outer key = collection path; inner key = doc id; value = data. */
  private documents = new Map<string, Map<string, SimDoc>>();
  /** Per-collection auto-id counter (T013). */
  private collectionCounters = new Map<string, number>();
  /** Subjects keyed by collection path; each emits the latest collection snapshot. */
  private collectionSubjects = new Map<string, BehaviorSubject<Array<SimDoc & { id: string }>>>();
  /** Subjects keyed by document path; each emits the latest doc snapshot or undefined. */
  private docSubjects = new Map<string, BehaviorSubject<(SimDoc & { id: string }) | undefined>>();

  private transactionWarningEmitted = false;

  // ── Reads ──

  getCollectionData<T>(path: string, _passId = true): Observable<T[]> {
    return this.getCollectionSubject(path).asObservable() as unknown as Observable<T[]>;
  }

  getCollectionDataByQuery<T>(query: SimQuery, _passId = true): Observable<T[]> {
    return this.getCollectionSubject(query.collectionPath).asObservable().pipe(
      map((all) => this.applyQuery(all, query)),
    ) as unknown as Observable<T[]>;
  }

  getDocData(path: string, _passId = true): Observable<unknown> {
    return this.getDocSubject(path).asObservable();
  }

  // ── Writes ──

  addDoc(path: string, data: SimDoc): Promise<{ id: string; path: string }> {
    return this.deferred(() => {
      const id = this.nextDocId(path);
      this.writeDoc(path, id, data);
      return { id, path: `${path}/${id}` };
    });
  }

  setDoc(docPath: string, data: SimDoc): Promise<void> {
    return this.deferred(() => {
      const { collection, id } = this.splitDocPath(docPath);
      this.writeDoc(collection, id, data);
    });
  }

  updateDoc(docPath: string, data: SimDoc): Promise<void> {
    return this.deferred(() => {
      const { collection, id } = this.splitDocPath(docPath);
      const existing = this.documents.get(collection)?.get(id) ?? {};
      this.writeDoc(collection, id, { ...existing, ...data });
    });
  }

  deleteDoc(docPath: string): Promise<void> {
    return this.deferred(() => {
      const { collection, id } = this.splitDocPath(docPath);
      this.documents.get(collection)?.delete(id);
      this.notifyCollection(collection);
      this.notifyDoc(`${collection}/${id}`);
    });
  }

  // ── Aggregation ──

  getCountFromServer(pathOrQuery: string | SimQuery): Promise<number> {
    return this.deferred(() => {
      if (typeof pathOrQuery === 'string') {
        return this.documents.get(pathOrQuery)?.size ?? 0;
      }
      const all = this.getCollectionSubject(pathOrQuery.collectionPath).getValue();
      return this.applyQuery(all, pathOrQuery).length;
    });
  }

  // ── Batched / transactional ──

  writeBatch(operations: Array<{ kind: 'set' | 'update' | 'delete'; docPath: string; data?: SimDoc }>): Promise<void> {
    return this.deferred(() => {
      const touched = new Set<string>();
      for (const op of operations) {
        const { collection, id } = this.splitDocPath(op.docPath);
        if (op.kind === 'set') {
          this.documents.get(collection)?.set(id, op.data ?? {});
          this.ensureCollection(collection).set(id, op.data ?? {});
        } else if (op.kind === 'update') {
          const existing = this.documents.get(collection)?.get(id) ?? {};
          this.ensureCollection(collection).set(id, { ...existing, ...(op.data ?? {}) });
        } else {
          this.documents.get(collection)?.delete(id);
        }
        touched.add(collection);
        this.notifyDoc(op.docPath);
      }
      for (const c of touched) this.notifyCollection(c);
    });
  }

  /**
   * FR-010a: single-pass atomic transaction. Clones store, runs callback,
   * commits the clone atomically. One-time warning per page session.
   */
  async runTransaction<T>(updateFn: (tx: SimTransaction) => Promise<T>): Promise<T> {
    if (!this.transactionWarningEmitted) {
      // eslint-disable-next-line no-console
      console.warn(TX_WARNING);
      this.transactionWarningEmitted = true;
    }
    const cloned = this.cloneStore();
    const tx = new SimTransaction(cloned);
    const result = await updateFn(tx);
    // Commit: replace live store with the clone, then notify all touched paths.
    this.documents = cloned;
    for (const collection of cloned.keys()) {
      this.notifyCollection(collection);
    }
    return result;
  }

  // ── Internals ──

  private nextDocId(path: string): string {
    const next = (this.collectionCounters.get(path) ?? 0) + 1;
    this.collectionCounters.set(path, next);
    return `sim-doc-${next}`;
  }

  private writeDoc(collection: string, id: string, data: SimDoc): void {
    this.ensureCollection(collection).set(id, { ...data });
    this.notifyCollection(collection);
    this.notifyDoc(`${collection}/${id}`);
  }

  private ensureCollection(path: string): Map<string, SimDoc> {
    let col = this.documents.get(path);
    if (!col) {
      col = new Map();
      this.documents.set(path, col);
    }
    return col;
  }

  private getCollectionSubject(path: string): BehaviorSubject<Array<SimDoc & { id: string }>> {
    let subj = this.collectionSubjects.get(path);
    if (!subj) {
      subj = new BehaviorSubject(this.snapshotCollection(path));
      this.collectionSubjects.set(path, subj);
    }
    return subj;
  }

  private getDocSubject(path: string): BehaviorSubject<(SimDoc & { id: string }) | undefined> {
    let subj = this.docSubjects.get(path);
    if (!subj) {
      const initial = this.snapshotDoc(path);
      subj = new BehaviorSubject(initial);
      this.docSubjects.set(path, subj);
    }
    return subj;
  }

  private snapshotCollection(path: string): Array<SimDoc & { id: string }> {
    const col = this.documents.get(path);
    if (!col) return [];
    const out: Array<SimDoc & { id: string }> = [];
    for (const [id, data] of col.entries()) {
      out.push({ ...data, id });
    }
    return out;
  }

  private snapshotDoc(path: string): (SimDoc & { id: string }) | undefined {
    const { collection, id } = this.splitDocPath(path);
    const data = this.documents.get(collection)?.get(id);
    return data ? { ...data, id } : undefined;
  }

  private notifyCollection(path: string): void {
    const subj = this.collectionSubjects.get(path);
    if (subj) subj.next(this.snapshotCollection(path));
  }

  private notifyDoc(path: string): void {
    const subj = this.docSubjects.get(path);
    if (subj) subj.next(this.snapshotDoc(path));
  }

  private applyQuery(all: Array<SimDoc & { id: string }>, q: SimQuery): Array<SimDoc & { id: string }> {
    let result = all.filter((doc) => q.filters.every((f) => this.matchFilter(doc, f)));
    if (q.orderBy.length > 0) {
      result = [...result].sort((a, b) => {
        for (const order of q.orderBy) {
          const av = (a as Record<string, unknown>)[order.field];
          const bv = (b as Record<string, unknown>)[order.field];
          if (av === bv) continue;
          const dir = order.direction === 'desc' ? -1 : 1;
          if (av === undefined) return 1;
          if (bv === undefined) return -1;
          return ((av as number | string) < (bv as number | string) ? -1 : 1) * dir;
        }
        // Tie-break by id ascending (deterministic).
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });
    }
    if (q.limit !== null) result = result.slice(0, q.limit);
    return result;
  }

  private matchFilter(doc: SimDoc & { id: string }, f: SimQueryFilter): boolean {
    const value = (doc as Record<string, unknown>)[f.field];
    switch (f.op) {
      case '==': return value === f.value;
      case '!=': return value !== f.value;
      case '<': return (value as number | string) < (f.value as number | string);
      case '<=': return (value as number | string) <= (f.value as number | string);
      case '>': return (value as number | string) > (f.value as number | string);
      case '>=': return (value as number | string) >= (f.value as number | string);
    }
  }

  private splitDocPath(docPath: string): { collection: string; id: string } {
    const lastSlash = docPath.lastIndexOf('/');
    if (lastSlash <= 0) {
      throw new HtQuickNgxFireError(`Invalid document path: ${docPath}`, 'invalid-path');
    }
    return {
      collection: docPath.slice(0, lastSlash),
      id: docPath.slice(lastSlash + 1),
    };
  }

  private cloneStore(): Map<string, Map<string, SimDoc>> {
    const cloned = new Map<string, Map<string, SimDoc>>();
    for (const [path, col] of this.documents.entries()) {
      const inner = new Map<string, SimDoc>();
      for (const [id, data] of col.entries()) {
        inner.set(id, { ...data });
      }
      cloned.set(path, inner);
    }
    return cloned;
  }

  private deferred<T>(fn: () => T): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queueMicrotask(() => {
        try { resolve(fn()); } catch (err) { reject(err); }
      });
    });
  }
}

/**
 * Minimal Transaction shim — supports the read+write pattern consumers use.
 */
export class SimTransaction {
  constructor(private store: Map<string, Map<string, SimDoc>>) {}

  get(docPath: string): Promise<{ exists: () => boolean; data: () => SimDoc | undefined; id: string }> {
    const lastSlash = docPath.lastIndexOf('/');
    const collection = docPath.slice(0, lastSlash);
    const id = docPath.slice(lastSlash + 1);
    const data = this.store.get(collection)?.get(id);
    return Promise.resolve({
      exists: () => data !== undefined,
      data: () => data ? { ...data } : undefined,
      id,
    });
  }

  set(docPath: string, data: SimDoc): void {
    const lastSlash = docPath.lastIndexOf('/');
    const collection = docPath.slice(0, lastSlash);
    const id = docPath.slice(lastSlash + 1);
    let col = this.store.get(collection);
    if (!col) { col = new Map(); this.store.set(collection, col); }
    col.set(id, { ...data });
  }

  update(docPath: string, data: SimDoc): void {
    const lastSlash = docPath.lastIndexOf('/');
    const collection = docPath.slice(0, lastSlash);
    const id = docPath.slice(lastSlash + 1);
    const existing = this.store.get(collection)?.get(id) ?? {};
    let col = this.store.get(collection);
    if (!col) { col = new Map(); this.store.set(collection, col); }
    col.set(id, { ...existing, ...data });
  }

  delete(docPath: string): void {
    const lastSlash = docPath.lastIndexOf('/');
    const collection = docPath.slice(0, lastSlash);
    const id = docPath.slice(lastSlash + 1);
    this.store.get(collection)?.delete(id);
  }
}
