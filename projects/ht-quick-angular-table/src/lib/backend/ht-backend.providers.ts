import { EnvironmentProviders, Provider } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { BackendConfig, HT_BACKEND_CONFIG } from './ht-backend.config';
import { htBackendInterceptor } from './ht-backend.interceptor';

/**
 * Convenience provider function for consumers to register the
 * backend configuration and HTTP interceptor in one call.
 *
 * @example
 * ```ts
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     ...provideHtBackend({ backendUrl: 'http://localhost:8000', apiKey: 'key' }),
 *   ],
 * });
 * ```
 */
export function provideHtBackend(config: BackendConfig): (Provider | EnvironmentProviders)[] {
  return [
    { provide: HT_BACKEND_CONFIG, useValue: config },
    provideHttpClient(withInterceptors([htBackendInterceptor])),
  ];
}
