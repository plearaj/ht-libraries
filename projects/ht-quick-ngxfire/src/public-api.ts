/*
 * Public API Surface of ht-quick-ngxfire
 */

export * from './lib/ht-quick-ngxfire.providers';
export * from './lib/firebase-config.model';
export * from './lib/ht-quick-ngxfire.error';
export * from './lib/firestore/ht-quick-firestore.service';
export * from './lib/firestore/batch-operations.model';
export * from './lib/auth/ht-auth.service';
export * from './lib/auth/ht-login.component';
export * from './lib/auth/auth-result.model';
export * from './lib/auth/ht-auth-admin.service';
export * from './lib/auth/ht-auth-user-sync.service';
export * from './lib/auth/ht-role.guard';
export * from './lib/auth/ht-auth-redirect.guard';
export * from './lib/storage/ht-storage.service';

// Simulation-mode public surface (FR-015a). Internal symbols
// (REQUIRED_FIELDS_BY_SERVICE, decideActivation, SERVICE_NAMES) are NOT
// exported here even though they live in the same modules — only the named
// types and classes below are part of the supported API.
export type { SimulationPolicy, ServiceName, ServiceMode, ActivationDecision } from './lib/simulation/simulation.types';
export { SimulationStatusService } from './lib/simulation/simulation-status.service';
export { SimAuthBackend } from './lib/simulation/auth/sim-auth.backend';
export { SimFirestoreBackend } from './lib/simulation/firestore/sim-firestore.backend';
export { SimStorageBackend } from './lib/simulation/storage/sim-storage.backend';
export { SimDatabaseBackend } from './lib/simulation/database/sim-database.backend';
export { SimFunctionsBackend } from './lib/simulation/functions/sim-functions.backend';
