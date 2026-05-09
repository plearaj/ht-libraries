import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { HT_BACKEND_CONFIG, BackendConfig } from './ht-backend.config';
import { DataResult } from '../skills/skill.types';
import { AgentBackendRunResponse, AgentRunRequest } from '../agent/agent.types';

/** Response shape for login and refresh endpoints. */
interface AuthResponse {
  accessToken: string;
  expiresIn: number;
}

/** Response shape for agent describe/refine endpoints. */
interface AgentResponse {
  tableSettings?: Record<string, unknown>;
  clarification?: string;
}

/** A single message in a conversation history. */
interface ChatMessage {
  role: string;
  content: string;
}

/**
 * Proxies all HTTP calls to the Python backend.
 *
 * Auth tokens are held in-memory only (never persisted).
 * Login/refresh/logout use `withCredentials` for cookie handling;
 * all other endpoints rely on the interceptor for Bearer headers.
 *
 * When `HT_BACKEND_CONFIG` is not provided, the service is still
 * injectable but all methods throw an error guiding the consumer
 * to call `provideHtBackend()`.
 */
@Injectable({ providedIn: 'root' })
export class HtBackendService {
  private readonly __http = inject(HttpClient, { optional: true });
  private readonly __config = inject(HT_BACKEND_CONFIG, { optional: true }) as BackendConfig | null;

  /** Whether the backend has been configured via `provideHtBackend()`. */
  get isConfigured(): boolean {
    return this.__config !== null && this.__http !== null;
  }

  private get _http(): HttpClient {
    if (!this.__http) {
      throw new Error(
        '[ht-quick-angular-table] HttpClient not available. Call provideHttpClient() in your application providers.',
      );
    }
    return this.__http;
  }

  private get _config(): BackendConfig {
    if (!this.__config) {
      throw new Error(
        '[ht-quick-angular-table] Backend not configured. Call provideHtBackend({ backendUrl, apiKey }) in your application providers.',
      );
    }
    return this.__config;
  }

  /** In-memory access token — never written to storage. */
  private readonly _accessToken = signal<string | null>(null);
  /** Whether the user currently has a valid access token. */
  private readonly _isAuthenticated = signal(false);

  /** Public read-only signal exposing authentication state. */
  readonly isAuthenticated = this._isAuthenticated.asReadonly();

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------

  /** Authenticate with the backend using the configured API key. */
  login(): Observable<AuthResponse> {
    return this._http
      .post<AuthResponse>(
        `${this._config.backendUrl}/auth/login`,
        { apiKey: this._config.apiKey },
        { withCredentials: true },
      )
      .pipe(
        tap((res) => this.setAccessToken(res.accessToken)),
      );
  }

  /** Refresh the access token using the HTTP-only refresh cookie. */
  refreshToken(): Observable<AuthResponse> {

    return this._http
      .post<AuthResponse>(
        `${this._config.backendUrl}/auth/refresh`,
        {},
        { withCredentials: true },
      )
      .pipe(
        tap((res) => this.setAccessToken(res.accessToken)),
      );
  }

  /** Log out — clears the access token and instructs the backend to revoke the session. */
  logout(): Observable<void> {

    return this._http
      .post<void>(
        `${this._config.backendUrl}/auth/logout`,
        {},
        { withCredentials: true },
      )
      .pipe(
        tap(() => this.setAccessToken(null)),
      );
  }

  // ---------------------------------------------------------------------------
  // Agent (table builder)
  // ---------------------------------------------------------------------------

  /** Ask the agent to describe a new table from a natural-language message. */
  describeTable(
    message: string,
    sessionHistory?: ChatMessage[],
  ): Observable<AgentResponse> {

    return this._http.post<AgentResponse>(
      `${this._config.backendUrl}/agent/describe`,
      { message, sessionHistory },
    );
  }

  /** Refine an existing table configuration via follow-up conversation. */
  refineTable(
    message: string,
    currentConfig: Record<string, unknown>,
    sessionHistory?: ChatMessage[],
  ): Observable<AgentResponse> {

    return this._http.post<AgentResponse>(
      `${this._config.backendUrl}/agent/refine`,
      { message, currentConfig, sessionHistory },
    );
  }

  // ---------------------------------------------------------------------------
  // Skills — Excel
  // ---------------------------------------------------------------------------

  /** Upload an Excel/CSV file and receive parsed data. */
  uploadExcel(file: File, sheet?: string): Observable<DataResult> {

    const formData = new FormData();
    formData.append('file', file);
    if (sheet) {
      formData.append('sheet', sheet);
    }
    return this._http.post<DataResult>(
      `${this._config.backendUrl}/skills/excel/upload`,
      formData,
    );
  }

  /** List available sheet names inside an Excel workbook. */
  listSheets(file: File): Observable<{ sheets: string[] }> {

    const formData = new FormData();
    formData.append('file', file);
    return this._http.post<{ sheets: string[] }>(
      `${this._config.backendUrl}/skills/excel/sheets`,
      formData,
    );
  }

  // ---------------------------------------------------------------------------
  // Skills — API
  // ---------------------------------------------------------------------------

  /** Pull data from an external API via the backend proxy. */
  pullApiData(config: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    jsonPath?: string;
  }): Observable<DataResult> {

    return this._http.post<DataResult>(
      `${this._config.backendUrl}/skills/api/pull`,
      config,
    );
  }

  // ---------------------------------------------------------------------------
  // Skills — Database
  // ---------------------------------------------------------------------------

  /** Execute a SQL query via the backend and receive parsed data. */
  queryDatabase(config: {
    dbType: string;
    connectionString: string;
    query: string;
    rowLimit?: number;
    timeoutSeconds?: number;
  }): Observable<DataResult> {

    return this._http.post<DataResult>(
      `${this._config.backendUrl}/skills/database/query`,
      config,
    );
  }

  /** Test a database connection without executing a query. */
  testDatabaseConnection(
    dbType: string,
    connectionString: string,
  ): Observable<{ connected: boolean; serverVersion: string }> {

    return this._http.post<{ connected: boolean; serverVersion: string }>(
      `${this._config.backendUrl}/skills/database/test`,
      { dbType, connectionString },
    );
  }

  // ---------------------------------------------------------------------------
  // Agent — run task
  // ---------------------------------------------------------------------------

  /** Execute an agent task against the provided table data via the backend. */
  runAgent(request: AgentRunRequest): Observable<AgentBackendRunResponse> {

    return this._http.post<AgentBackendRunResponse>(
      `${this._config.backendUrl}/agent/run`,
      request,
    );
  }

  // ---------------------------------------------------------------------------
  // Token helpers (used by the interceptor)
  // ---------------------------------------------------------------------------

  /** Return the current in-memory access token (may be `null`). */
  getAccessToken(): string | null {
    return this._accessToken();
  }

  /** Update the access token and derived authentication flag. */
  setAccessToken(token: string | null): void {
    this._accessToken.set(token);
    this._isAuthenticated.set(token !== null);
  }
}
