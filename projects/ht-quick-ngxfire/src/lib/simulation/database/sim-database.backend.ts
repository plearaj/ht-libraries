import { Injectable } from '@angular/core';

/**
 * SimDatabaseBackend — in-memory Realtime Database simulation (E10).
 *
 * Plain `@Injectable()` (registered conditionally per L4 / T009).
 *
 * Absent-path semantics (L6): subscribing via `onValue` to a path with no
 * value fires the callback once with `null` on subscribe, matching real
 * Firebase RTDB behavior.
 */

@Injectable()
export class SimDatabaseBackend {
  private tree: Record<string, unknown> = {};
  private listeners = new Map<string, Set<(value: unknown) => void>>();
  /** Per-parent push-key counter (T015 mirror of T013's per-collection scope). */
  private pushCounters = new Map<string, number>();

  set(path: string, value: unknown): Promise<void> {
    return this.deferred(() => {
      this.writePath(path, value);
      this.fanOut(path);
    });
  }

  update(path: string, partial: Record<string, unknown>): Promise<void> {
    return this.deferred(() => {
      const existing = this.readPath(path);
      const merged: Record<string, unknown> = (existing && typeof existing === 'object')
        ? { ...(existing as Record<string, unknown>), ...partial }
        : { ...partial };
      this.writePath(path, merged);
      this.fanOut(path);
    });
  }

  remove(path: string): Promise<void> {
    return this.deferred(() => {
      this.deletePath(path);
      this.fanOut(path);
    });
  }

  push(path: string, value: unknown): Promise<{ key: string }> {
    return this.deferred(() => {
      const next = (this.pushCounters.get(path) ?? 0) + 1;
      this.pushCounters.set(path, next);
      const key = `sim-rtdb-${next}`;
      const childPath = `${path}/${key}`;
      this.writePath(childPath, value);
      this.fanOut(childPath);
      return { key };
    });
  }

  onValue(path: string, callback: (value: unknown) => void): () => void {
    let subs = this.listeners.get(path);
    if (!subs) { subs = new Set(); this.listeners.set(path, subs); }
    subs.add(callback);
    // Fire once on subscribe (with `null` for absent path, per L6).
    queueMicrotask(() => callback(this.readPath(path) ?? null));
    return () => { subs?.delete(callback); };
  }

  once(path: string): Promise<unknown> {
    return this.deferred(() => this.readPath(path) ?? null);
  }

  // ── Internals ──

  private writePath(path: string, value: unknown): void {
    const segments = this.splitPath(path);
    let node: Record<string, unknown> = this.tree;
    for (let i = 0; i < segments.length - 1; i++) {
      const key = segments[i];
      const next = node[key];
      if (next === null || next === undefined || typeof next !== 'object') {
        node[key] = {};
      }
      node = node[key] as Record<string, unknown>;
    }
    node[segments[segments.length - 1]] = value;
  }

  private readPath(path: string): unknown {
    const segments = this.splitPath(path);
    let node: unknown = this.tree;
    for (const key of segments) {
      if (node === null || node === undefined || typeof node !== 'object') return undefined;
      node = (node as Record<string, unknown>)[key];
    }
    return node;
  }

  private deletePath(path: string): void {
    const segments = this.splitPath(path);
    if (segments.length === 0) {
      this.tree = {};
      return;
    }
    let node: Record<string, unknown> = this.tree;
    for (let i = 0; i < segments.length - 1; i++) {
      const next = node[segments[i]];
      if (next === null || next === undefined || typeof next !== 'object') return;
      node = next as Record<string, unknown>;
    }
    delete node[segments[segments.length - 1]];
  }

  private fanOut(writtenPath: string): void {
    const segments = this.splitPath(writtenPath);
    // Fire listeners on the path itself and every ancestor.
    for (let i = segments.length; i >= 0; i--) {
      const ancestorPath = segments.slice(0, i).join('/');
      const subs = this.listeners.get(ancestorPath);
      if (subs && subs.size > 0) {
        const value = this.readPath(ancestorPath) ?? null;
        for (const cb of subs) {
          queueMicrotask(() => cb(value));
        }
      }
    }
  }

  private splitPath(path: string): string[] {
    return path.split('/').filter((s) => s.length > 0);
  }

  private deferred<T>(fn: () => T): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queueMicrotask(() => {
        try { resolve(fn()); } catch (err) { reject(err); }
      });
    });
  }
}
