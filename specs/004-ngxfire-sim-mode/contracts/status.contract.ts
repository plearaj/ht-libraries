/**
 * Contract: simulation status surface and activation decision (FR-007).
 *
 * SPEC ARTIFACT — documents the public types `SimulationStatusService` exposes
 * and the internal `ActivationDecision` shape returned by the pure
 * `decideActivation` function.
 */

import type { ServiceName } from './config.contract';

/**
 * Per-service runtime mode.
 *
 * - `'real'`      — service is registered against real `@angular/fire` providers.
 * - `'simulated'` — service runs against the in-memory simulator backend.
 * - `'disabled'`  — service is not registered (consumer set the FirebaseConfig
 *                   flag to `false`, or auth has zero providers enabled).
 */
export type ServiceMode = 'real' | 'simulated' | 'disabled';

/**
 * Output of the pure `decideActivation` function. Plain data; no Angular,
 * no I/O, no `console`. Constructed once per `provideHtQuickNgxFire` call.
 */
export interface ActivationDecision {
  /** Per-service mode — exhaustive over ServiceName. */
  services: Record<ServiceName, ServiceMode>;

  /**
   * What `'auto'` resolved to (or what `'force'`/`'forbid'` mandated).
   * `'simulate'` means: register simulator backends for any under-configured
   *   enabled service.
   * `'throw'` means: block app bootstrap with the populated `error` below.
   */
  policyResolved: 'simulate' | 'throw';

  /**
   * For each service whose required fields were missing, the list of those
   * field names. Consumed by the startup warning (FR-004) and the
   * production-mode error (FR-005).
   */
  missingFieldsByService: Partial<Record<ServiceName, string[]>>;

  /**
   * Populated when at least one service is `'simulated'` AND
   * `policyResolved === 'throw'`. The provider throws this; otherwise null.
   *
   * Error message MUST list every under-configured service and its missing
   * fields, plus the `simulation: 'force'` opt-in instructions (FR-005).
   */
  error: SimulationActivationError | null;
}

/**
 * Specialised HtQuickNgxFireError thrown by the activation decision when
 * the resolved policy is `'throw'` and at least one enabled service is
 * under-configured.
 *
 * Implementation should extend the existing `HtQuickNgxFireError` class
 * (do not invent a new error hierarchy) and tag it with code
 * `'simulation-activation-blocked'`.
 */
export interface SimulationActivationError extends Error {
  code: 'simulation-activation-blocked';
  underConfigured: Partial<Record<ServiceName, string[]>>;
}

/**
 * Pure activation decision function. Implementation lives at
 * `projects/ht-quick-ngxfire/src/lib/simulation/activation.ts`.
 *
 * MUST be a synchronous pure function: same input → equal output, no I/O,
 * no `console`, no `inject(...)`.
 */
export type DecideActivation = (input: {
  /** The full FirebaseConfig the consumer passed to provideHtQuickNgxFire. */
  config: import('./config.contract').FirebaseConfig;
  /** Read once at the call site via `isDevMode()`; passed in for testability (R6). */
  isDevMode: boolean;
}) => ActivationDecision;

/**
 * Read-only public surface for FR-007. Consumers inject this to render
 * "demo mode" UI affordances or to branch behavior at runtime.
 *
 * Implementation: an `@Injectable({ providedIn: 'root' })` class populated
 * by `provideHtQuickNgxFire` via APP_INITIALIZER before any Ht*Service is
 * constructed (so constructor-time backend switches always see populated
 * status).
 */
export interface SimulationStatusService {
  /** Frozen per-service map. */
  readonly services: ReadonlyMap<ServiceName, ServiceMode>;

  /** Convenience: `true` iff any service is `'simulated'`. */
  readonly isAnySimulated: boolean;

  /** What the policy field resolved to. */
  readonly policyResolved: 'simulate' | 'throw';

  /**
   * Convenience accessor. Throws `HtQuickNgxFireError` (code
   * `'invalid-service-name'`) if `name` is not a ServiceName.
   */
  get(name: ServiceName): ServiceMode;
}
