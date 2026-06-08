import {
  EnvironmentProviders,
  InjectionToken,
  makeEnvironmentProviders,
  APP_INITIALIZER,
  Provider,
  isDevMode,
  inject,
} from "@angular/core";
import { FirebaseOptions, initializeApp, provideFirebaseApp } from "@angular/fire/app";
import { FirebaseConfig } from "./firebase-config.model";
import { provideAuth, getAuth } from "@angular/fire/auth";
import { provideFirestore, getFirestore } from "@angular/fire/firestore";
import { provideDatabase, getDatabase } from "@angular/fire/database";
import { provideFunctions, getFunctions } from "@angular/fire/functions";
import { provideStorage, getStorage } from "@angular/fire/storage";
import { HtAuthUserSyncService } from "./auth/ht-auth-user-sync.service";
import { decideActivation } from "./simulation/activation";
import { SimulationStatusService } from "./simulation/simulation-status.service";
import type { ActivationDecision, ServiceName } from "./simulation/simulation.types";
import { SERVICE_NAMES } from "./simulation/simulation.types";
import { SimAuthBackend } from "./simulation/auth/sim-auth.backend";
import { SimFirestoreBackend } from "./simulation/firestore/sim-firestore.backend";
import { SimStorageBackend } from "./simulation/storage/sim-storage.backend";
import { SimDatabaseBackend } from "./simulation/database/sim-database.backend";
import { SimFunctionsBackend } from "./simulation/functions/sim-functions.backend";

export const FIREBASE_CONFIG = new InjectionToken<FirebaseOptions>("firebaseConfig");
export const AUTH_OPTIONS = new InjectionToken<FirebaseConfig["authOptions"]>("authOptions");

/**
 * Module-scoped (singleton across page session) dedup set for FR-004.
 * Keyed by a stable digest of the resolved ActivationDecision.
 */
const warnedDecisions = new Set<string>();

export const provideHtQuickNgxFire = (config: FirebaseConfig): EnvironmentProviders => {
  // Step 1: decide activation (synchronous, pure).
  const decision = decideActivation({ config, isDevMode: isDevMode() });

  // Step 2: if the resolved policy says throw and at least one service is
  // under-configured, abort bootstrap with the typed error (FR-005).
  if (decision.error) {
    throw decision.error;
  }

  const SIM_BACKENDS_BY_SERVICE: Record<ServiceName, unknown> = {
    auth: SimAuthBackend,
    firestore: SimFirestoreBackend,
    database: SimDatabaseBackend,
    functions: SimFunctionsBackend,
    storage: SimStorageBackend,
  };

  const providers: (Provider | EnvironmentProviders)[] = [
    { provide: AUTH_OPTIONS, useValue: config.authOptions },
    // Populate SimulationStatusService from the decision before any Ht*Service
    // is constructed (so constructor-time branches see populated status).
    {
      provide: APP_INITIALIZER,
      useFactory: (status: SimulationStatusService) => () => {
        status._apply(decision);
        return Promise.resolve();
      },
      deps: [SimulationStatusService],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: (_userSyncService: HtAuthUserSyncService) => () => Promise.resolve(),
      deps: [HtAuthUserSyncService],
      multi: true,
    },
  ];

  // Apply the decision *eagerly* via a useFactory that runs at provider creation
  // time as well — this protects against constructor-time reads happening
  // before APP_INITIALIZER fires.
  providers.push({
    provide: SIMULATION_DECISION,
    useFactory: () => {
      const status = inject(SimulationStatusService);
      status._apply(decision);
      return decision;
    },
  });

  // Per-service registration: real OR simulated OR disabled.
  let anyReal = false;
  for (const name of SERVICE_NAMES) {
    const mode = decision.services[name];
    if (mode === 'real') {
      anyReal = true;
      providers.push(realProviderFor(name, config.firebaseOptions));
    } else if (mode === 'simulated') {
      const backendClass = SIM_BACKENDS_BY_SERVICE[name];
      providers.push({ provide: backendClass as never, useClass: backendClass as never });
    }
    // 'disabled' → register nothing.
  }

  // Initialize the Firebase app only if at least one service is real
  // (zero-network-call guarantee FR-003 in all-simulated mode).
  if (anyReal) {
    providers.unshift(provideFirebaseApp(() => initializeApp(config.firebaseOptions ?? {})));
  }

  // FR-004: emit one console.warn per unique decision (module-scoped dedup).
  if (decision.policyResolved === 'simulate' && hasAnySimulated(decision)) {
    const key = digestDecision(decision);
    if (!warnedDecisions.has(key)) {
      warnedDecisions.add(key);
      // eslint-disable-next-line no-console
      console.warn(formatStartupWarning(decision));
    }
  }

  return makeEnvironmentProviders(providers);
};

/** Internal token used to force the activation decision to apply eagerly. */
const SIMULATION_DECISION = new InjectionToken<ActivationDecision>('htQuickNgxFire.simulationDecision');

function realProviderFor(name: ServiceName, _options: FirebaseOptions | undefined): EnvironmentProviders {
  switch (name) {
    case 'auth': return provideAuth(() => getAuth());
    case 'firestore': return provideFirestore(() => getFirestore());
    case 'database': return provideDatabase(() => getDatabase());
    case 'functions': return provideFunctions(() => getFunctions());
    case 'storage': return provideStorage(() => getStorage());
  }
}

function hasAnySimulated(decision: ActivationDecision): boolean {
  for (const name of SERVICE_NAMES) {
    if (decision.services[name] === 'simulated') return true;
  }
  return false;
}

function digestDecision(decision: ActivationDecision): string {
  const parts: string[] = [];
  for (const name of SERVICE_NAMES) {
    parts.push(`${name}=${decision.services[name]}`);
    const missing = decision.missingFieldsByService[name];
    if (missing && missing.length > 0) parts.push(`${name}-missing=${missing.join(',')}`);
  }
  parts.push(`policy=${decision.policyResolved}`);
  return parts.join('|');
}

function formatStartupWarning(decision: ActivationDecision): string {
  const simulated: string[] = [];
  const real: string[] = [];
  const disabled: string[] = [];
  for (const name of SERVICE_NAMES) {
    const mode = decision.services[name];
    if (mode === 'simulated') {
      const missing = decision.missingFieldsByService[name];
      simulated.push(missing && missing.length > 0 ? `${name} (missing ${missing.join(', ')})` : name);
    } else if (mode === 'real') {
      real.push(name);
    } else {
      disabled.push(name);
    }
  }
  const lines = ['[ht-quick-ngxfire] Simulation mode active.'];
  if (simulated.length > 0) lines.push(`Simulated services: ${simulated.join('; ')}.`);
  if (real.length > 0) lines.push(`Real services: ${real.join(', ')}.`);
  lines.push("Set firebaseOptions to point at a real Firebase project to disable.");
  return lines.join(' ');
}
