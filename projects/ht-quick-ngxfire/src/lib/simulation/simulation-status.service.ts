import { Injectable } from '@angular/core';
import { HtQuickNgxFireError } from '../ht-quick-ngxfire.error';
import type { ActivationDecision, ServiceMode, ServiceName } from './simulation.types';
import { SERVICE_NAMES } from './simulation.types';

/**
 * Read-only public surface for FR-007 — consumers inject this to render
 * "demo mode" UI affordances or branch behavior at runtime.
 *
 * Default state is all-`'real'` so existing tests that don't call
 * `provideHtQuickNgxFire` continue to take the real-branch path in
 * sim-aware Ht*Services.
 */
@Injectable({ providedIn: 'root' })
export class SimulationStatusService {
  private serviceMap: Map<ServiceName, ServiceMode> = new Map(
    SERVICE_NAMES.map((name) => [name, 'real' as ServiceMode]),
  );
  private resolvedPolicy: 'simulate' | 'throw' = 'simulate';

  get services(): ReadonlyMap<ServiceName, ServiceMode> {
    return this.serviceMap;
  }

  get isAnySimulated(): boolean {
    for (const mode of this.serviceMap.values()) {
      if (mode === 'simulated') return true;
    }
    return false;
  }

  get policyResolved(): 'simulate' | 'throw' {
    return this.resolvedPolicy;
  }

  get(name: ServiceName): ServiceMode {
    if (!SERVICE_NAMES.includes(name)) {
      throw new HtQuickNgxFireError(
        `Invalid service name: ${String(name)}. Expected one of ${SERVICE_NAMES.join(', ')}.`,
        'invalid-service-name',
      );
    }
    return this.serviceMap.get(name) ?? 'real';
  }

  /**
   * Internal: populate from an activation decision. Called by
   * `provideHtQuickNgxFire`. Not part of the public contract; not exported.
   */
  _apply(decision: ActivationDecision): void {
    this.serviceMap = new Map(
      SERVICE_NAMES.map((name) => [name, decision.services[name]]),
    );
    this.resolvedPolicy = decision.policyResolved;
  }
}
