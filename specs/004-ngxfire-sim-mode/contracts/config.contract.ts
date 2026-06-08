/**
 * Contract: configuration shape changes for ht-quick-ngxfire simulation mode.
 *
 * This file is a SPEC ARTIFACT — it documents the additive shape that the
 * library's `firebase-config.model.ts` must export after this feature lands.
 * It is not compiled or imported by the runtime; it exists for review,
 * generated tests, and downstream tooling.
 *
 * Source of truth for behavior: spec.md (FR-001, FR-001a, FR-005, FR-015).
 */

import type { FirebaseOptions } from '@angular/fire/app';

/**
 * Tri-state simulation policy attached to FirebaseConfig.
 *
 * - `'auto'`  — default; follows Angular's `isDevMode()`. Missing required
 *               firebaseOptions fields → simulate in dev / throw in prod.
 * - `'force'` — always allow simulation regardless of build mode. Used by
 *               test runners, Storybook, e2e harnesses, and demo deployments
 *               shipped as production builds.
 * - `'forbid'` — never simulate. Missing required fields always throw,
 *                regardless of build mode.
 */
export type SimulationPolicy = 'auto' | 'force' | 'forbid';

/**
 * Existing AuthOptions interface — unchanged by this feature.
 * Reproduced here for the FirebaseConfig shape below.
 */
export interface AuthOptions {
  email?: boolean;
  google?: boolean;
  facebook?: boolean;
  twitter?: boolean;
  github?: boolean;
  microsoft?: boolean;
  apple?: boolean;
  preferRedirect?: boolean;
}

/**
 * Updated FirebaseConfig shape after this feature lands.
 *
 * BREAKING-CHANGE-FREE: every existing field keeps its current type. Two
 * additive changes:
 *   1. `firebaseOptions` becomes optional (was required).
 *   2. `simulation?: SimulationPolicy` is added; default `'auto'`.
 *
 * Consumers who currently pass a complete config see zero behavior change.
 */
export interface FirebaseConfig {
  authOptions: AuthOptions;
  /**
   * Firebase web config. Now optional; when absent (or partially present),
   * the per-service activation decision (FR-001 / FR-001a) determines
   * which services initialize against real Firebase and which simulate.
   */
  firebaseOptions?: FirebaseOptions;
  firestore: boolean;
  database: boolean;
  functions: boolean;
  storage: boolean;
  /**
   * Simulation policy. Default `'auto'`. See SimulationPolicy.
   */
  simulation?: SimulationPolicy;
}

/**
 * The frozen per-service required-field map (FR-001a). Single source of
 * truth for the activation decision and the production-mode error message.
 *
 * Implementation MUST export this constant from
 * `projects/ht-quick-ngxfire/src/lib/simulation/simulation.types.ts`,
 * frozen via `Object.freeze`, but MUST NOT add it to `public-api.ts` —
 * it is internal to the activation decision and tests.
 */
export const REQUIRED_FIELDS_BY_SERVICE = {
  auth: ['apiKey', 'authDomain'],
  firestore: ['apiKey', 'projectId'],
  database: ['apiKey', 'databaseURL'],
  functions: ['apiKey', 'projectId'],
  storage: ['apiKey', 'storageBucket'],
} as const;

export type ServiceName = keyof typeof REQUIRED_FIELDS_BY_SERVICE;
