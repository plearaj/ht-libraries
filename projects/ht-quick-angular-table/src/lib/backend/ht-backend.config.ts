import { InjectionToken } from '@angular/core';

/** Configuration for connecting to the Python backend. */
export interface BackendConfig {
  /** Base URL of the Python backend (e.g., 'http://localhost:8000'). */
  backendUrl: string;
  /** Developer API key for initial authentication. */
  apiKey: string;
}

/** Injection token for the backend configuration. */
export const HT_BACKEND_CONFIG = new InjectionToken<BackendConfig>('HT_BACKEND_CONFIG');
