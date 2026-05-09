import { Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import type { DataResult, AgentBackendRunResponse, AgentRunRequest } from 'ht-quick-angular-table';

interface AuthResponse { accessToken: string; expiresIn: number; }
interface AgentResponse { tableSettings?: Record<string, unknown>; clarification?: string; }

/**
 * Drop-in replacement for `HtBackendService` that returns canned responses.
 * Used by the demo app so backend-dependent features (AI builder, agent, skills,
 * insights AI summary) work without a real Python backend or API key.
 */
@Injectable({ providedIn: 'root' })
export class MockHtBackendService {
  readonly isConfigured = true;
  private readonly _isAuthenticated = signal(true);
  readonly isAuthenticated = this._isAuthenticated.asReadonly();

  login(): Observable<AuthResponse> {
    return of({ accessToken: 'mock-token', expiresIn: 3600 }).pipe(delay(200));
  }

  refreshToken(): Observable<AuthResponse> {
    return of({ accessToken: 'mock-token', expiresIn: 3600 }).pipe(delay(200));
  }

  logout(): Observable<void> {
    return of(undefined).pipe(delay(100));
  }

  describeTable(message: string): Observable<AgentResponse> {
    const lower = message.toLowerCase();
    if (lower.includes('employee')) {
      return of({
        tableSettings: {
          tableName: 'employees',
          noRecordMessage: 'No employees found.',
          columns: [
            { columnHeader: 'Name',       columnDataName: 'name',       columnDataType: 'string',     sortable: true, filterable: true },
            { columnHeader: 'Department', columnDataName: 'department', columnDataType: 'string',     sortable: true, filterable: true },
            { columnHeader: 'Salary',     columnDataName: 'salary',     columnDataType: 'number',     sortable: true, filterable: false },
            { columnHeader: 'Hire Date',  columnDataName: 'hireDate',   columnDataType: 'dateString', sortable: true, filterable: false },
          ],
          filter: { showFilter: true, filterType: 'simple' },
          paginator: { showPagination: true, pageSize: 10, pageSizeOptions: [5, 10, 25] },
        },
      }).pipe(delay(600));
    }
    if (lower.includes('summarize') || lower.includes('summary')) {
      return of({
        clarification: 'Dataset contains 15 products across 4 categories. Two items are out of stock (Webcam HD, Wireless Charger). Average price is $82.43 with total inventory of 2,115 units.',
      }).pipe(delay(600));
    }
    return of({
      clarification: `Mock builder: I'd build a table from "${message}" — configure a real backend to see live AI output.`,
    }).pipe(delay(400));
  }

  refineTable(message: string): Observable<AgentResponse> {
    return of({
      tableSettings: {
        tableName: 'refined',
        noRecordMessage: 'No records.',
        columns: [
          { columnHeader: 'Name',       columnDataName: 'name',       columnDataType: 'string', sortable: true, filterable: true },
          { columnHeader: 'Email',      columnDataName: 'email',      columnDataType: 'string', sortable: true, filterable: true },
          { columnHeader: 'Department', columnDataName: 'department', columnDataType: 'string', sortable: true, filterable: true },
        ],
        filter: { showFilter: true, filterType: 'column' },
        paginator: { showPagination: true, pageSize: 10, pageSizeOptions: [5, 10, 25] },
      },
    }).pipe(delay(500));
  }

  uploadExcel(file: File): Observable<DataResult> {
    return of(this._mockDataResult(file.name, 'excel')).pipe(delay(800));
  }

  listSheets(): Observable<{ sheets: string[] }> {
    return of({ sheets: ['Products', 'Inventory', 'Suppliers'] }).pipe(delay(400));
  }

  pullApiData(config: { url: string }): Observable<DataResult> {
    return of(this._mockDataResult(config.url, 'api')).pipe(delay(700));
  }

  queryDatabase(config: { query: string }): Observable<DataResult> {
    return of(this._mockDataResult(config.query, 'database')).pipe(delay(700));
  }

  testDatabaseConnection(dbType: string): Observable<{ connected: boolean; serverVersion: string }> {
    return of({ connected: true, serverVersion: `${dbType} 14.5 (mock)` }).pipe(delay(300));
  }

  runAgent(request: AgentRunRequest): Observable<AgentBackendRunResponse> {
    const rows = request.rows ?? [];
    const outOfStock = rows.filter((r) => (r as { quantity?: number }).quantity === 0);
    const actions = outOfStock.flatMap((_, idx) => [
      { actionName: 'flagItem',    rowIndex: rows.indexOf(outOfStock[idx]), status: 'success' as const, result: { flagged: true } },
      { actionName: 'createAlert', rowIndex: rows.indexOf(outOfStock[idx]), status: 'success' as const, result: { alertId: `ALERT-${idx + 1}` } },
    ]);
    return of({
      summary: `Mock agent analyzed ${rows.length} rows and flagged ${outOfStock.length} out-of-stock items for restocking.`,
      actions,
      durationMs: 450,
    }).pipe(delay(800));
  }

  getAccessToken(): string | null { return 'mock-token'; }
  setAccessToken(_token: string | null): void { /* no-op */ }

  private _mockDataResult(_source: string, kind: 'excel' | 'api' | 'database'): DataResult {
    const rows = [
      { id: 1, sku: 'SKU-001', name: 'Mock Product A', price: 19.99, stock: 120 },
      { id: 2, sku: 'SKU-002', name: 'Mock Product B', price: 29.99, stock: 45 },
      { id: 3, sku: 'SKU-003', name: 'Mock Product C', price: 49.99, stock: 0 },
      { id: 4, sku: 'SKU-004', name: 'Mock Product D', price: 9.99,  stock: 800 },
    ];
    return {
      rows,
      columns: [
        { name: 'id',    dataName: 'id',    dataType: 'number' },
        { name: 'sku',   dataName: 'sku',   dataType: 'string' },
        { name: 'name',  dataName: 'name',  dataType: 'string' },
        { name: 'price', dataName: 'price', dataType: 'number' },
        { name: 'stock', dataName: 'stock', dataType: 'number' },
      ],
      totalRows: rows.length,
      truncated: false,
      metadata: { source: kind },
    };
  }
}
