import { Injectable } from '@angular/core';

/**
 * SimFunctionsBackend — callable Cloud Functions simulator (E11, R3).
 *
 * Plain `@Injectable()` — registered conditionally per L4 / T009.
 *
 * Unregistered callables resolve `{ data: null }` and emit one warning per
 * name per page session (R3).
 */

@Injectable()
export class SimFunctionsBackend {
  private stubs = new Map<string, (payload: unknown) => unknown | Promise<unknown>>();
  private unregisteredWarned = new Set<string>();

  httpsCallable<TPayload = unknown, TResult = unknown>(
    name: string,
  ): (payload: TPayload) => Promise<{ data: TResult | null }> {
    return async (payload: TPayload) => {
      const stub = this.stubs.get(name);
      if (stub) {
        const result = await Promise.resolve(stub(payload));
        return { data: result as TResult };
      }
      if (!this.unregisteredWarned.has(name)) {
        // eslint-disable-next-line no-console
        console.warn(
          `[ht-quick-ngxfire] httpsCallable('${name}'): no stub registered. Resolving { data: null }. Use SimFunctionsBackend.registerStub('${name}', handler) to provide a response.`,
        );
        this.unregisteredWarned.add(name);
      }
      return { data: null };
    };
  }

  registerStub(name: string, handler: (payload: unknown) => unknown | Promise<unknown>): void {
    this.stubs.set(name, handler);
  }

  clearStubs(): void {
    this.stubs.clear();
    this.unregisteredWarned.clear();
  }
}
