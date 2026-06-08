import type { ServiceName } from './simulation/simulation.types';
import { SERVICE_NAMES } from './simulation/simulation.types';

/**
 * Custom error class for ht-quick-ngxfire library
 */
export class HtQuickNgxFireError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'HtQuickNgxFireError';
  }
}

/**
 * Specialised error thrown by the activation decision when the resolved
 * policy is `'throw'` and at least one enabled service is under-configured
 * (FR-005). Carries a structured `underConfigured` map so tests can assert
 * the exact missing-fields set without fragile substring matching.
 */
export class SimulationActivationError extends HtQuickNgxFireError {
  static readonly OPT_IN_INSTRUCTION =
    "Set `simulation: 'force'` on FirebaseConfig to allow simulation in this build, or supply a complete firebaseOptions value.";

  readonly underConfigured: Readonly<Partial<Record<ServiceName, string[]>>>;

  constructor(underConfigured: Partial<Record<ServiceName, string[]>>) {
    const lines: string[] = [];
    for (const name of SERVICE_NAMES) {
      const fields = underConfigured[name];
      if (fields && fields.length > 0) {
        lines.push(`${name}: missing ${fields.join(', ')}`);
      }
    }
    const message = `Simulation activation blocked. Under-configured services:\n${lines.join('\n')}\n${SimulationActivationError.OPT_IN_INSTRUCTION}`;
    super(message, 'simulation-activation-blocked');
    this.name = 'SimulationActivationError';
    this.underConfigured = Object.freeze({ ...underConfigured });
  }
}
