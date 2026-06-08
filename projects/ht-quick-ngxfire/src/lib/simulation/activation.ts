/**
 * Pure activation decision (FR-001, FR-001a, FR-005, FR-006).
 *
 * Cross-references US2 acceptance scenarios 1–5:
 *   - 'auto' + dev + missing → simulate (US2 scenario 1)
 *   - 'auto' + prod + missing → throw (US2 scenario 2)
 *   - 'force' + missing → simulate, dev or prod (US2 scenario 3)
 *   - 'forbid' + missing → throw, dev or prod (US2 scenario 4)
 *   - status surface populated before first auth call (US2 scenario 5)
 *
 * MUST be a pure function: no inject(), no console, no I/O. Same input ⇒
 * equal output. Performance target: < 1ms on commodity hardware (Edge Cases
 * "Activation-decision performance" in spec.md).
 */

import { HtQuickNgxFireError, SimulationActivationError } from '../ht-quick-ngxfire.error';
import type { FirebaseConfig } from '../firebase-config.model';
import type { ActivationDecision, ServiceMode, ServiceName, SimulationPolicy } from './simulation.types';
import { REQUIRED_FIELDS_BY_SERVICE, SERVICE_NAMES } from './simulation.types';

const VALID_POLICIES: readonly SimulationPolicy[] = ['auto', 'force', 'forbid'];

export interface DecideActivationInput {
  config: FirebaseConfig;
  isDevMode: boolean;
}

export function decideActivation(input: DecideActivationInput): ActivationDecision {
  const { config, isDevMode } = input;

  if (config === null || config === undefined) {
    throw new HtQuickNgxFireError('FirebaseConfig is required', 'invalid-config');
  }

  // Validate the policy field; reject anything outside the literal union (FR-005).
  const rawPolicy = config.simulation;
  if (rawPolicy !== undefined && !VALID_POLICIES.includes(rawPolicy)) {
    throw new HtQuickNgxFireError(
      `Invalid simulation policy: ${String(rawPolicy)}. Expected 'auto' | 'force' | 'forbid' or undefined.`,
      'invalid-simulation-policy',
    );
  }
  const policy: SimulationPolicy = rawPolicy ?? 'auto';

  // Resolve the policy to a concrete action.
  const policyResolved: 'simulate' | 'throw' =
    policy === 'force' ? 'simulate' :
    policy === 'forbid' ? 'throw' :
    isDevMode ? 'simulate' : 'throw';

  // Auth-enabled iff at least one provider is truthy (R4).
  const authEnabled = isAuthEnabled(config);

  const services = {} as Record<ServiceName, ServiceMode>;
  const missingFieldsByService: Partial<Record<ServiceName, string[]>> = {};

  for (const name of SERVICE_NAMES) {
    const enabled = isServiceEnabled(name, config, authEnabled);
    if (!enabled) {
      services[name] = 'disabled';
      continue;
    }
    const missing = computeMissingFields(name, config);
    if (missing.length === 0) {
      services[name] = 'real';
    } else {
      missingFieldsByService[name] = missing;
      services[name] = policyResolved === 'simulate' ? 'simulated' : 'real';
      // When policyResolved === 'throw', we'll surface an error below — the
      // 'real' marker here is informational; bootstrap is aborted.
    }
  }

  const hasUnderConfigured = Object.keys(missingFieldsByService).length > 0;
  const error = (policyResolved === 'throw' && hasUnderConfigured)
    ? new SimulationActivationError(missingFieldsByService)
    : null;

  return Object.freeze({
    services,
    policyResolved,
    missingFieldsByService,
    error,
  });
}

function isAuthEnabled(config: FirebaseConfig): boolean {
  const opts = config.authOptions;
  if (!opts) return false;
  return Boolean(
    opts.email ||
    opts.google ||
    opts.facebook ||
    opts.twitter ||
    opts.github ||
    opts.microsoft ||
    opts.apple,
  );
}

function isServiceEnabled(name: ServiceName, config: FirebaseConfig, authEnabled: boolean): boolean {
  switch (name) {
    case 'auth': return authEnabled;
    case 'firestore': return Boolean(config.firestore);
    case 'database': return Boolean(config.database);
    case 'functions': return Boolean(config.functions);
    case 'storage': return Boolean(config.storage);
  }
}

function computeMissingFields(name: ServiceName, config: FirebaseConfig): string[] {
  const required = REQUIRED_FIELDS_BY_SERVICE[name];
  const opts = config.firebaseOptions ?? {};
  const missing: string[] = [];
  for (const field of required) {
    const raw = (opts as Record<string, unknown>)[field];
    if (typeof raw !== 'string' || raw.trim() === '') {
      missing.push(field);
    }
  }
  return missing;
}
