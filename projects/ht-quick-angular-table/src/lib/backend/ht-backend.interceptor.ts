import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
  HttpEvent,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, Subject, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs';
import { HtBackendService } from './ht-backend.service';
import { HT_BACKEND_CONFIG } from './ht-backend.config';

/** Auth endpoint suffixes that the interceptor must NOT touch. */
const AUTH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout'];

/** Module-level state shared across all invocations of the interceptor. */
let isRefreshing = false;
const refreshSubject = new Subject<string>();

/**
 * Functional HTTP interceptor that:
 * 1. Attaches a Bearer token to requests aimed at the backend.
 * 2. Transparently refreshes the token on 401 responses.
 * 3. Prevents refresh storms by queuing concurrent requests while a
 *    refresh is in flight.
 */
export const htBackendInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const backendService = inject(HtBackendService);
  const config = inject(HT_BACKEND_CONFIG);

  // Only intercept requests targeting our backend.
  if (!req.url.startsWith(config.backendUrl)) {
    return next(req);
  }

  // Never touch auth endpoints — they manage their own credentials.
  if (AUTH_PATHS.some((path) => req.url.includes(path))) {
    return next(req);
  }

  // Attach the current token (if available).
  const authedReq = addToken(req, backendService.getAccessToken());

  return next(authedReq).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return handle401(req, next, backendService);
      }
      return throwError(() => error);
    }),
  );
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Clone a request with an Authorization header when a token exists. */
function addToken(
  req: HttpRequest<unknown>,
  token: string | null,
): HttpRequest<unknown> {
  if (!token) {
    return req;
  }
  return req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });
}

/**
 * Attempt a single token refresh and retry the original request.
 * If a refresh is already in progress, wait for it instead of
 * issuing a second refresh call.
 */
function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  backendService: HtBackendService,
): Observable<HttpEvent<unknown>> {
  if (isRefreshing) {
    // A refresh is already in flight — wait for the new token.
    return refreshSubject.pipe(
      take(1),
      switchMap((newToken) => next(addToken(req, newToken))),
    );
  }

  isRefreshing = true;

  return backendService.refreshToken().pipe(
    switchMap((res) => {
      isRefreshing = false;
      refreshSubject.next(res.accessToken);
      return next(addToken(req, res.accessToken));
    }),
    catchError((refreshError: unknown) => {
      isRefreshing = false;
      backendService.setAccessToken(null);
      return throwError(() => refreshError);
    }),
  );
}
