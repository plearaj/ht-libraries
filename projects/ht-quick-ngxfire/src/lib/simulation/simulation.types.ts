/**
 * Type definitions for simulation mode (FR-001a, FR-005, FR-007, data-model E1-E5).
 *
 * Internal note: REQUIRED_FIELDS_BY_SERVICE is exported from this module for
 * use by the activation function and provider, but is intentionally NOT
 * re-exported from public-api.ts — it's an internal contract per FR-015a.
 */

export type SimulationPolicy = 'auto' | 'force' | 'forbid';

export type ServiceName = 'auth' | 'firestore' | 'database' | 'functions' | 'storage';

export type ServiceMode = 'real' | 'simulated' | 'disabled';

export const SERVICE_NAMES: readonly ServiceName[] = Object.freeze([
  'auth',
  'firestore',
  'database',
  'functions',
  'storage',
]);

/**
 * Per-service required `firebaseOptions` fields (FR-001a).
 * Frozen to prevent runtime mutation.
 */
export const REQUIRED_FIELDS_BY_SERVICE: Readonly<Record<ServiceName, readonly string[]>> = Object.freeze({
  auth: Object.freeze(['apiKey', 'authDomain']) as readonly string[],
  firestore: Object.freeze(['apiKey', 'projectId']) as readonly string[],
  database: Object.freeze(['apiKey', 'databaseURL']) as readonly string[],
  functions: Object.freeze(['apiKey', 'projectId']) as readonly string[],
  storage: Object.freeze(['apiKey', 'storageBucket']) as readonly string[],
});

/**
 * Output of `decideActivation` — plain data, immutable.
 */
export interface ActivationDecision {
  services: Record<ServiceName, ServiceMode>;
  policyResolved: 'simulate' | 'throw';
  missingFieldsByService: Partial<Record<ServiceName, string[]>>;
  error: Error | null;
}
