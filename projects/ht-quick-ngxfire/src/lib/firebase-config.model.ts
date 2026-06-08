import { FirebaseOptions } from "@angular/fire/app";
import type { SimulationPolicy } from "./simulation/simulation.types";

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

export interface FirebaseConfig {
  authOptions: AuthOptions;
  firebaseOptions?: FirebaseOptions;
  firestore: boolean;
  database: boolean;
  functions: boolean;
  storage: boolean;
  /**
   * Activation policy for simulation mode (FR-005).
   * - `'auto'` (default): simulate in dev, throw in prod when fields are missing.
   * - `'force'`: simulate regardless of build mode.
   * - `'forbid'`: never simulate; missing fields throw.
   */
  simulation?: SimulationPolicy;
}
