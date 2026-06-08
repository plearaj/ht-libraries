# ht-quick-angular-table

Declarative Angular Material data table driven by a single `TableSettings` instance plus a stream of rows. Add filtering, pagination, selection, action columns, inline add/save/delete, and drag-and-drop without writing a custom table component. Optionally wire up a Python backend (`provideHtBackend`) to unlock data-ingestion **skills** (Excel / API / SQL), an **AI table builder**, **chart** + **insights** widgets, and an **agent** that runs scripted or LLM-driven actions over your rows.

> AI-agent README: section headings and symbol names are stable. The library has two layers — a **stand-alone table** (no backend, no extra deps beyond Angular Material + `chart.js` peer) and an **AI/skill stack** that requires `provideHtBackend(...)`. Use only the layer you need.

---

## TL;DR for agents

- **Bootstrap the table** with `provideHtQuickAngularTable()` in `app.config.ts`. Then push two things to `HtQuickAngularTableService`: `setTableSettings(new TableSettings(...))` and `setTableData(rows)`. Render `<ht-quick-angular-table>` once.
- **Build the `TableSettings` once per page**; instantiate it via its 9-arg positional constructor. Required helpers: `IDynamicMatTableColumn[]`, `DynamicMatTableFilter`, `DynamicMatTablePaginator`, `DynamicMatTableSelection`, `DynamicMatTableActionSettings`, `DynamicMatTableDataInteractionSettings`. Don't hand-instantiate `DynamicMatTableColumn` — pass column **interfaces** (`columnDataType`, `columnDataName`, etc.) and let `TableSettings` wrap them.
- **Backend stack is opt-in.** If you don't call `provideHtBackend(config)`, `HtBackendService.isConfigured` returns `false` and every backend-dependent service throws a configuration error on use. Skills, builder, agent (`runBackend`), and `<ht-table-insights enableAiSummary>` all require the backend.
- **Chart + insights** are pure data → DOM widgets. They take `data` and `config` `input.required`s and don't need the backend (`HtTableInsightsComponent` only needs it when `enableAiSummary: true`).
- **Don't `npm install` inside this lib's directory.** All peer deps must live at the workspace root or you'll trip the path-too-long / NG0203 trap.

---

## Install

```bash
# In the consuming app
npm install ht-quick-angular-table @angular/material @angular/cdk chart.js ng2-charts
```

`package.json`:

```json
{
  "peerDependencies": {
    "@angular/common": "^21.2.0",
    "@angular/core": "^21.2.0"
  },
  "dependencies": {
    "chart.js": "^4.5.1",
    "ng2-charts": "^9.0.0"
  }
}
```

The library uses `@angular/material` (table, paginator, sort, button, icon, menu, dialog, form-field, input, checkbox, toolbar, select, progress-spinner) and `@angular/cdk/collections` (`SelectionModel`). Make sure Material is set up in your app (theme + Roboto + `mat-icon` fonts).

---

## Bootstrap

### Table-only setup

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHtQuickAngularTable } from 'ht-quick-angular-table';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    provideRouter(routes),
    provideHtQuickAngularTable(),
  ],
};
```

`provideHtQuickAngularTable()` registers `HtQuickAngularTableService` and the standalone component. The component is `OnPush` and standalone — you can also import `HtQuickAngularTableComponent` directly into a component's `imports` array.

### Add the AI / skill backend (optional)

```typescript
import { provideHtBackend } from 'ht-quick-angular-table';

providers: [
  provideHtQuickAngularTable(),
  ...provideHtBackend({
    backendUrl: 'https://your-fastapi-host',
    apiKey: 'developer-api-key',
  }),
],
```

`provideHtBackend()` returns a `(Provider | EnvironmentProviders)[]` — spread it into the array. It registers `HT_BACKEND_CONFIG`, calls `provideHttpClient(withInterceptors([htBackendInterceptor]))`, and wires the bearer-token / refresh interceptor. The Python FastAPI service ships in `projects/ht-quick-angular-table/backend/` (see `MIGRATION.md`).

---

## Public API surface

Exported from `public-api.ts`:

**Core table**
- `provideHtQuickAngularTable()` → `EnvironmentProviders`
- `HtQuickAngularTableComponent` (selector `ht-quick-angular-table`)
- `HtQuickAngularTableService` — singleton bus for settings/data/selection
- `TableSettings` — the configuration object
- `DynamicMatTableColumn`, `IDynamicMatTableColumn`, `ColumnDataType`, plus typed column interfaces (`DynamicBasicColumn`, `DynamicEditableColumn`, `DynamicHyperlinkColumn`, `DynamicRouterLinkColumn`, `DynamicDialogColumn`, `DynamicObjectColumn`)
- `DynamicMatTableFilter`, `DynamicMatTableFilterOptions`
- `DynamicMatTablePaginator`, `PaginatorSettings`, `IPaginatorSettings`
- `DynamicMatTableSelection`
- `DynamicMatTableActionSettings`, `DynamicMatTableActionOptions`, `DynamicMatTableSingleAction`, `DynamicMatTableMenuAction`
- `DynamicMatTableDataInteractionSettings` + per-feature classes (`DynamicMatTableDataAddSettings` / `DynamicMatTableDataAddOptions` / `DynamicMatTableAddByRouting` / `DynamicMatTableAddByNewItem` / `NewDataItemFnAnon` / `NewDataItemFnParams` / `NewDataItemFnElement`; `DynamicMatTableDeleteSettings` / `DynamicMatTableDataDeleteOptions`; `DynamicMatTableSaveSettings` / `DynamicMatTableSaveOptions` / `SaveDataFnElement` / `SaveDataFnElements`)
- `DynamicMatTableButton`, `Icon`, `ButtonColor`, `ButtonIcon`
- `Dialog`, `TableState`, `DynamicTable` (interfaces)

**Backend stack**
- `provideHtBackend(config)` → `(Provider | EnvironmentProviders)[]`
- `HtBackendService` — proxy for FastAPI auth + endpoints
- `HT_BACKEND_CONFIG` token, `BackendConfig` interface

**Skills**
- `SkillRegistryService` — register / configure / execute data-ingestion skills
- `HtSkillMenuComponent` (selector `ht-skill-menu`)
- `HtExcelInputComponent`, `HtApiInputComponent`, `HtDatabaseInputComponent`
- `HtSheetSelectDialogComponent` + `SheetSelectDialogData`
- Types: `Skill`, `SkillConfig`, `ExcelUploadConfig`, `ApiPullConfig`, `DatabaseConfig`, `SkillExecution`, `SkillExecutionStatus`, `SkillError`, `DataResult`, `ColumnDefinition`, `ResultMetadata`

**Chart**
- `HtTableChartComponent` (selector `ht-table-chart`)
- `ChartConfig`, `ChartType`

**Insights**
- `HtTableInsightsComponent` (selector `ht-table-insights`)
- `InsightsConfig`, `ColumnStatistics`

**AI table builder**
- `HtTableBuilderService` — back-and-forth conversation that returns a `TableSettings`
- `BuilderMessage`, `BuilderResult`

**Agent**
- `HtTableAgentService` — schedule/reactive/on-demand action runner + backend LLM agent
- `HtTableAgentComponent` (selector `ht-table-agent`)
- Types: `AgentConfig`, `AgentAction`, `AgentTrigger`, `AgentTableTrigger`, `AgentNextStep`, `AgentRunMode`, `AgentRunResult`, `AgentActionEvent`, `AgentFailureEvent`, `AgentActionContext`, `AgentBackendActionResult`, `AgentBackendRunResponse`, `AgentRunRequest`

---

## Core: `<ht-quick-angular-table>` and `HtQuickAngularTableService`

The component renders entirely off two `BehaviorSubject`s on the service. Updating either one updates the table — no `@Input()` for data.

### `HtQuickAngularTableService`

Provided in `'root'`. Source: `src/lib/ht-quick-angular-table.service.ts`.

| Member | Type | Use |
|--------|------|-----|
| `setTableSettings(settings: TableSettings)` | method | Push the config (columns, filter, pager, etc.). |
| `setTableData(data: any[])` | method | Push or replace the rows. |
| `tableSetting$` | `Observable<TableSettings \| null>` | Internal — component subscribes. |
| `dataSource$` | `Observable<any[] \| null>` | Internal — component subscribes. |
| `rowSelected$` | `Observable<SelectionModel<any>>` | Selection stream (also emitted as a component output). |
| `_rowSelected(selection)` | method | Internal. |

### `<ht-quick-angular-table>`

| Outputs | Type | When |
|---------|------|------|
| `rowSelected` | `SelectionModel<any>` | Master toggle / per-row selection changes. |
| `rowAction` | `{ action: string; row: any }` | A user-clicked action button or menu item. |

The component owns its own `MatTableDataSource`, `MatSort`, `MatPaginator`, simple-filter `FormControl`, column-filter `FormGroup` (built by `TableSettings`), and `SelectionModel`. It auto-prepends:
- a `select` column when `DynamicMatTableSelection.showSelection` is `true`
- a `drag` column when `allowDragAndDrop` is `true`
- an `actions` column at `actionOptions.position` when an action column is enabled.

There is no `ngOnChanges` / data input — every update flows through the service, which lets you keep multiple table instances on a page if each gets its own service instance via `providers: [HtQuickAngularTableService]`.

---

## Building a `TableSettings`

`TableSettings` is the config object the component renders against. Constructor (positional, in this order):

```typescript
new TableSettings(
  columns: IDynamicMatTableColumn[],
  filterSettings: DynamicMatTableFilter,
  paginatorSettings: DynamicMatTablePaginator,
  selectionSettings: DynamicMatTableSelection,
  tableActionSettings: DynamicMatTableActionSettings,
  tableName: string,
  dataInteractionSettings: DynamicMatTableDataInteractionSettings,
  allowDragAndDrop: boolean,
  noRecordMessage: string,
)
```

It throws `Error('[ht-quick-angular-table] TableSettings requires at least one column definition.')` if `columns` is empty.

### Columns

A column is described as one of these interfaces (all extend `TableColumn`):

| Interface | `columnDataType` | Extra fields |
|-----------|------------------|--------------|
| `DynamicBasicColumn` | `'string' \| 'number' \| 'date' \| 'dateRange' \| 'dateString' \| 'boolean'` | `editable: false`, `isLink: false`, `allowMassUpdate` |
| `DynamicEditableColumn` | same as basic | `editable: true`, `formField` |
| `DynamicHyperlinkColumn` | `'hyperlink'` | `isLink: true`, `url: (el) => string` |
| `DynamicRouterLinkColumn` | `'routerLink' \| 'routerLinkCell'` | `isLink: true`, `url: (el) => string[]` |
| `DynamicDialogColumn` | `'dialog' \| 'dialogCell' \| 'dialogIcon'` | `dialog: Dialog` |
| `DynamicObjectColumn` | `'object'` | `objectValueToDisplay: (el) => any` |

Common (`TableColumn`): `columnHeader`, `columnDataName`, `sortable`, `filterable`, optional `colClass: Record<string, boolean>` and `cellClass: (el) => string`.

`ColumnDataType` is also exported as an enum (string values match the literals above) — use it or the string literals.

`select`, `drag`, and `action` column types are managed internally — you never declare them. Pass `tableActionSettings.showActionColumn = true` to get an action column; it's inserted at `actionOptions.position`.

### Filter settings

```typescript
new DynamicMatTableFilter(false);
// or
new DynamicMatTableFilter(true, new DynamicMatTableFilterOptions(
  /* filterType */ 'simple' | 'column' = 'simple',
  /* filterOnDataChange */ false,
  /* keepFilters */ false,
));
```

`'simple'` renders one global `<mat-form-field>` that drives `MatTableDataSource.filter`. `'column'` builds a `FormGroup` with one `FormControl` per filterable column (and a `FormGroup` of `start`/`end` for `dateRange` columns) and stores it on `TableSettings.filterFormGroup`.

### Paginator settings

```typescript
new DynamicMatTablePaginator(false);
// or
new DynamicMatTablePaginator(true, {
  pageSize: 10,
  pageSizeOptions: [5, 10, 25],
  hidePageSize: false,
  showFirstLastButtons: false,
  allowMaxLength: false, // appends data.length as a page-size option
});
```

### Selection settings

```typescript
new DynamicMatTableSelection(false);
// or
new DynamicMatTableSelection(true, new SelectionModel<MyRow>(true /* multi */, []));
```

### Action settings

```typescript
new DynamicMatTableActionSettings(false);
// or
new DynamicMatTableActionSettings(true, new DynamicMatTableActionOptions(
  /* one of: */
  new DynamicMatTableSingleAction('single' | 'icon-link', icon)
  | new DynamicMatTableMenuAction([icon, ...], menuIconColor)
  | (el => DynamicMatTableSingleAction | DynamicMatTableMenuAction | 'edit' | 'link' | 'dialog' | 'none')
  | 'edit' | 'link' | 'dialog' | 'delete',
  /* position */ 0,
  /* actionHeader */ 'Action',
));
```

`Icon = { name, color: ButtonColor, size? }`. `ButtonColor` is an enum: `Default | Primary | Accent | Warn | Emphasis | Error | Success | Info`. The `'variable'` case (callback returning per-row decision) lets each row choose a different action UI.

When the user clicks an action, the component emits `(rowAction)="..."` with `{ action: string, row: any }`.

### Data-interaction settings (add / delete / save)

```typescript
new DynamicMatTableDataInteractionSettings(
  /* add    */ new DynamicMatTableDataAddSettings(false),
  /* delete */ new DynamicMatTableDeleteSettings(false),
  /* save   */ new DynamicMatTableSaveSettings(false),
);
```

Each `*Settings` constructor follows the same overload pattern as `Selection`/`Action`/`Filter` — pass `false` to disable, or pass `true` plus a corresponding `*Options` instance.

**Add** — `DynamicMatTableDataAddOptions(notifyOfAddBy, addBy, addButton?)` where `addBy` is one of:
- `new DynamicMatTableAddByRouting(['/path', 'segment'])` — clicking Add navigates with `relativeTo: ActivatedRoute`.
- `new DynamicMatTableAddByNewItem('function' | 'dialog' | 'table', NewDataItem | NewDataItemFnAnon | NewDataItemFnParams | NewDataItemFnElement)` — supplies the new row template / factory.

`NewDataItem = any` (literal), or one of the wrapper classes that hold a callback — pick the wrapper whose call shape matches your creator (`() => row`, `(params) => row`, `(element) => row`).

**Delete** — `DynamicMatTableDataDeleteOptions(notifyOfDeleteBy, deleteButton?)`.

**Save** — `DynamicMatTableSaveOptions(notifySaveBy, 'pass-data' | SaveDataFnElement | SaveDataFnElements, saveButton?)`.

`notifyOfAddBy / notifyOfDeleteBy / notifySaveBy` are `'subscription' | 'event'`, indicating whether you want to be notified by subscribing to the service or by the component's outputs (today the component primarily emits `(rowAction)`; subscription wiring is partial — verify against the source if you need it).

### Minimal example

```typescript
import { Component, inject } from '@angular/core';
import { SelectionModel } from '@angular/cdk/collections';
import {
  HtQuickAngularTableComponent,
  HtQuickAngularTableService,
  TableSettings,
  DynamicMatTableFilter, DynamicMatTableFilterOptions,
  DynamicMatTablePaginator,
  DynamicMatTableSelection,
  DynamicMatTableActionSettings,
  DynamicMatTableDataInteractionSettings,
  DynamicMatTableDataAddSettings,
  DynamicMatTableDeleteSettings,
  DynamicMatTableSaveSettings,
} from 'ht-quick-angular-table';

@Component({
  selector: 'app-orders',
  imports: [HtQuickAngularTableComponent],
  template: `<ht-quick-angular-table (rowAction)="onAction($event)" />`,
})
export class OrdersComponent {
  private table = inject(HtQuickAngularTableService);

  constructor() {
    this.table.setTableSettings(new TableSettings(
      [
        { columnHeader: 'Order #', columnDataName: 'id',     columnDataType: 'string', sortable: true,  filterable: true,  editable: false, allowMassUpdate: false, isLink: false },
        { columnHeader: 'Total',   columnDataName: 'total',  columnDataType: 'number', sortable: true,  filterable: true,  editable: false, allowMassUpdate: false, isLink: false },
        { columnHeader: 'Placed',  columnDataName: 'placed', columnDataType: 'date',   sortable: true,  filterable: false, editable: false, allowMassUpdate: false, isLink: false },
      ],
      new DynamicMatTableFilter(true, new DynamicMatTableFilterOptions('simple')),
      new DynamicMatTablePaginator(true, { pageSize: 10, pageSizeOptions: [10, 25, 50] }),
      new DynamicMatTableSelection(true, new SelectionModel<any>(true, [])),
      new DynamicMatTableActionSettings(false),
      'orders',
      new DynamicMatTableDataInteractionSettings(
        new DynamicMatTableDataAddSettings(false),
        new DynamicMatTableDeleteSettings(false),
        new DynamicMatTableSaveSettings(false),
      ),
      false,
      'No orders yet.',
    ));

    this.table.setTableData(/* your rows */ []);
  }

  onAction(e: { action: string; row: any }) { /* ... */ }
}
```

---

## Backend layer (`HtBackendService`)

`@Injectable({ providedIn: 'root' })`. Talks to a FastAPI service. Auth tokens live in-memory only (a `signal`); refresh cookies are HTTP-only via `withCredentials`. The functional interceptor `htBackendInterceptor` (registered automatically by `provideHtBackend`):

1. Adds `Authorization: Bearer <token>` to every request to `backendUrl` except `/auth/login | /auth/refresh | /auth/logout`.
2. On `401`, refreshes the access token once and retries — concurrent requests queue on a shared `Subject` to prevent refresh storms.

| Method | Verb | Endpoint | Purpose |
|--------|------|----------|---------|
| `login()` | POST | `/auth/login` | Exchange `apiKey` for an access token. |
| `refreshToken()` | POST | `/auth/refresh` | Use HTTP-only refresh cookie to mint a new access token. |
| `logout()` | POST | `/auth/logout` | Revoke + clear in-memory token. |
| `describeTable(message, sessionHistory?)` | POST | `/agent/describe` | LLM: "build me a table for X". |
| `refineTable(message, currentConfig, sessionHistory?)` | POST | `/agent/refine` | LLM: tweak an existing table. |
| `uploadExcel(file, sheet?)` | POST (multipart) | `/skills/excel/upload` | Parse Excel/CSV → `DataResult`. |
| `listSheets(file)` | POST (multipart) | `/skills/excel/sheets` | List sheet names for an `.xlsx`. |
| `pullApiData({ url, method?, headers?, body?, jsonPath? })` | POST | `/skills/api/pull` | Server-side fetch + JSONPath extract. |
| `queryDatabase({ dbType, connectionString, query, rowLimit?, timeoutSeconds? })` | POST | `/skills/database/query` | Execute SQL via the backend (creds never leave the server). |
| `testDatabaseConnection(dbType, connectionString)` | POST | `/skills/database/test` | Cheap connectivity probe. |
| `runAgent(request: AgentRunRequest)` | POST | `/agent/run` | LLM-driven action runner over your table. |

State signals: `isAuthenticated` (read-only signal), `getAccessToken()`, `setAccessToken(token \| null)`. `isConfigured` is `true` only when both `HT_BACKEND_CONFIG` and `HttpClient` are present.

---

## Skills layer

A "skill" is a reusable data-ingestion action shown in the table's toolbar (`<ht-skill-menu>`). The registry is `'root'`-scoped so skills survive route changes.

### `SkillRegistryService`

| Method / state | Description |
|----------------|-------------|
| `registerSkill(skill: Skill)` | Adds a skill (no-op on duplicate `id`). |
| `unregisterSkill(id)` | Removes by id. |
| `configureSkill(id, config: SkillConfig)` | Replace a skill's `configSchema`. |
| `executeSkill(id, params?)` | Returns `Observable<DataResult>`. **Refuses** to start while another skill is running (returns `EMPTY`). |
| `registeredSkills` | `readonly Signal<Skill[]>` |
| `currentExecution` | `readonly Signal<SkillExecution \| null>` |
| `isExecuting` | `computed` boolean |

`Skill` shape:

```typescript
interface Skill {
  id: string;
  name: string;
  icon?: string;            // Material icon name
  configSchema: SkillConfig; // ExcelUploadConfig | ApiPullConfig | DatabaseConfig
}
```

`DataResult`:

```typescript
interface DataResult {
  columns: ColumnDefinition[]; // { name, dataName, dataType }
  rows: Record<string, unknown>[];
  totalRows: number;
  truncated: boolean;
  metadata?: ResultMetadata;
}
```

### Skill components

- `<ht-skill-menu>` — Material menu populated from `SkillRegistryService.registeredSkills`. Emits `(skillSelected)="..."` with the chosen `Skill`. The toolbar inside `<ht-quick-angular-table>` already mounts this menu.
- `<ht-excel-input [config]="ExcelUploadConfig">` — drag-and-drop file picker; emits `(fileSelected)="onFile($event)"` with a validated `File`.
- `<ht-api-input>` — emits `(configSubmitted)="cfg => …"` with an `ApiPullConfig`.
- `<ht-database-input>` — emits `(configSubmitted)="cfg => …"` with a `DatabaseConfig`.
- `<ht-sheet-select-dialog>` — open via `MatDialog` with `data: SheetSelectDialogData = { sheets }`. Closes with the selected sheet name.

Typical wire-up:

```typescript
const registry = inject(SkillRegistryService);
registry.registerSkill({
  id: 'excel', name: 'Excel upload', icon: 'upload_file',
  configSchema: { type: 'excel-upload', maxFileSizeMb: 10, allowedFormats: ['.xlsx', '.csv'] },
});

// somewhere in the page after the user picks a file:
registry.executeSkill('excel', { file }).subscribe(result => {
  this.tableService.setTableData(result.rows);
});
```

---

## Chart and insights

Both are pure widgets that consume `data` + `config` `input.required`s and stay in sync via `computed` signals.

### `<ht-table-chart>`

```html
<ht-table-chart
  [config]="{ type: 'bar', xColumn: 'month', yColumns: ['revenue', 'cost'], label: 'Q1' }"
  [data]="rows" />
```

| Field | Type |
|-------|------|
| `type` | `'bar' \| 'line' \| 'pie'` |
| `xColumn` | string — must exist on every row |
| `yColumns` | `string[]` — for `pie`, only the first is used |
| `label?` | optional title |

If a column is missing from the first row, the component renders nothing and exposes the error message via the internal `state` signal (you can read it for debugging via `viewChild`).

Bundles `chart.js` + `ng2-charts`; uses `Chart.register(...registerables)` once at module load.

### `<ht-table-insights>`

```html
<ht-table-insights
  [config]="{ statisticColumns: ['revenue', 'units'], enableAiSummary: true }"
  [data]="rows" />
```

Computes `count / sum / avg / min / max` for each numeric column synchronously via a `computed` signal. When `enableAiSummary: true`, debounces (300 ms) and POSTs a sanitized 5-row sample + statistics to `/agent/describe`, exposing the result as the readonly `aiSummary` signal (truncated at 2000 chars). Errors land in `aiError`. **Requires `provideHtBackend(...)`.**

---

## AI table builder (`HtTableBuilderService`)

A small chat loop that returns ready-to-render `TableSettings`. Validates the LLM JSON before constructing the settings object — caps at 50 columns, 128-char names, 256-char headers, 2000-char user messages, page size 1–1000, and `pageSizeOptions ≤ 10`.

| Method | Returns |
|--------|---------|
| `describe(userMessage)` | `Promise<BuilderResult>` — first turn |
| `refine(userMessage, current: TableSettings)` | `Promise<BuilderResult>` — follow-ups |
| `reset()` | `void` — clears `sessionHistory` |
| `sessionHistory` | `readonly Signal<BuilderMessage[]>` |

`BuilderResult = { tableSettings?: TableSettings; clarification?: string }` — when the model needs more info, you get back a `clarification` string and no settings. Allowed column types from the builder: `'string' | 'number' | 'date' | 'dateString' | 'boolean'`. Allowed filter types: `'simple' | 'column'`.

```typescript
const builder = inject(HtTableBuilderService);
const result = await builder.describe('Build a leads table with name, email, score, and signup date.');
if (result.tableSettings) this.tableService.setTableSettings(result.tableSettings);
else console.log('AI needs:', result.clarification);
```

---

## Agent (`HtTableAgentService` + `<ht-table-agent>`)

Two flavors of execution share one service:

**Client-side** — register actions + triggers, then `run()` (or run on a schedule / when data changes) **without** the backend.

**Backend-driven** — `runBackend(task)` ships sampled rows + derived columns to `/agent/run` and emits per-action events as the LLM responds.

### Client-side configuration

```typescript
const agent = inject(HtTableAgentService<MyRow>);

agent.configure({
  actions: [
    { name: 'flag', handler: async ({ row }) => /* ... */ },
    { name: 'notify', handler: async ({ row, previousResult }) => /* ... */ },
  ],
  triggers: [
    { scope: 'row', actionName: 'flag', condition: r => r.score > 0.9,
      next: { actionName: 'notify', condition: result => result === 'ok' } },
  ],
  runMode: 'on-demand', // or 'scheduled' (needs scheduleIntervalMs >= 1000) or 'reactive'
  scheduleIntervalMs: 5000,
  timeoutMs: 30_000, // per-action default
});

agent.connectDataSource(() => this.rows()); // signal getter — used by run() AND scheduled/reactive modes
const result = await agent.run(); // { actionsInvoked, failures, durationMs }
```

Validation in `configure()`:
- ≥ 1 action and ≥ 1 trigger
- no duplicate action names
- triggers (and `next.actionName`) must reference real actions
- `scheduled` mode requires `scheduleIntervalMs >= 1000`

Runtime guards:
- per-action `timeoutMs` (default 30 s)
- chain depth ≤ 10 (warns then halts)
- `MAX_ACTIONS_PER_RUN = 1000` (warns then halts)
- only one `run()` may be in flight; concurrent calls return the in-flight promise

### Backend-driven

```typescript
agent.connectDataSource(() => this.rows());
const response = await agent.runBackend('Score every lead and recommend follow-ups.');
// response: AgentBackendRunResponse = { actions: AgentBackendActionResult[], summary, durationMs }
```

`runBackend()` samples up to 500 rows, truncates string fields > 500 chars, derives column types from `typeof` of the first row, and POSTs to `/agent/run`. Per-action results fan out through the same observable streams as client-side runs.

### Streams + state

| | Type |
|---|---|
| `actionCompleted$` | `Observable<AgentActionEvent<T>>` |
| `actionFailed$`    | `Observable<AgentFailureEvent<T>>` |
| `runCompleted$`    | `Observable<AgentRunResult>` |
| `warning$`         | `Observable<string>` |
| `isRunning`        | readonly signal |
| `lastRunResult`    | readonly signal `AgentRunResult \| null` |

The `actionCompleted` / `actionFailed` / `runCompleted` / `warning` getters exist as `@deprecated` `Subject` aliases — prefer the `$`-suffixed observables.

### `<ht-table-agent>`

Drop-in UI for `runBackend`:

```html
<ht-table-agent
  placeholder="Tell the agent what to do..."
  (taskCompleted)="onComplete($event)"
  (taskFailed)="onError($event)" />
```

`taskCompleted` → `AgentBackendRunResponse`, `taskFailed` → error message string. The component disables the submit button while `agentService.isRunning()` is `true`. **Requires `provideHtBackend(...)`.**

---

## Recipes

### Hand-rolled column with a router link

```typescript
{
  columnHeader: 'Customer',
  columnDataName: 'customer',
  columnDataType: 'routerLink',
  sortable: true,
  filterable: false,
  editable: false,
  allowMassUpdate: false,
  isLink: true,
  url: row => ['/customers', row.customerId],
}
```

### Action menu with per-row icons

```typescript
new DynamicMatTableActionSettings(true, new DynamicMatTableActionOptions(
  new DynamicMatTableMenuAction([
    { name: 'edit',   color: ButtonColor.Default },
    { name: 'delete', color: ButtonColor.Warn },
  ], 'primary'),
  /* position */ 99, // pushed to the end
));
```

### Drive a chart from the same rows the table renders

```typescript
this.table.setTableData(rows);
this.chartConfig.set({ type: 'line', xColumn: 'date', yColumns: ['value'] });
```

```html
<ht-quick-angular-table />
<ht-table-chart [config]="chartConfig()" [data]="rows()" />
```

### Plug an AI summary on top of an existing table

```html
<ht-table-insights
  [config]="{ statisticColumns: ['revenue'], enableAiSummary: true }"
  [data]="rows()" />
```

(needs `provideHtBackend(...)`)

---

## Notes for AI agents extending this library

1. **Column behavior is type-driven.** Adding a new render mode means: extend `ColumnDataType`, add an interface in `dynamic-mat-table-column.model.ts`, teach `DynamicMatTableColumn`'s constructor to recognize it, and update the `ht-quick-angular-table.component.html` template branches. Don't add a parallel concept (e.g. a separate `customRenderer` input) — keep behavior inside the column-type union.
2. **Don't mutate `TableSettings` after construction.** All public fields are `readonly`; the few `WritableSignal`s are the documented mutation points. Build a new `TableSettings` and call `setTableSettings()` again.
3. **Skills are validated where they execute.** `SkillRegistryService._dispatchSkill` re-validates `excel-upload` (file extension + size) before hitting the backend. If you add a skill type, add a discriminated branch and the equivalent guard.
4. **Builder JSON is hostile input.** `_validateBuilderJson` enforces hard caps (column count, header lengths, allowed types). Don't loosen these without a security review — the builder feeds an LLM response straight into `TableSettings`.
5. **`HtTableAgentService` is generic.** Inject it as `HtTableAgentService<MyRow>` to get typed action contexts. The same instance is shared across the app via `'root'` — if you need isolation per page, provide it locally.
6. **Backend services degrade safely.** `HtBackendService.isConfigured` is the public probe — feature components can check it before showing AI-only UI rather than catching the configuration error at call time.
7. **Migration tail.** `MIGRATION.md` documents removed APIs (`provideHtAi`, `HT_AI_PROVIDER`, `AiModelAdapter`, `createAiAdapter`). All AI calls now go through `HtBackendService`; no browser-side LLM SDK is required.

---

## File map

```
src/
  public-api.ts
  lib/
    ht-quick-angular-table.providers.ts        # provideHtQuickAngularTable
    ht-quick-angular-table.service.ts          # singleton bus (settings/data/selection)
    ht-quick-angular-table.component.{ts,html,scss}  # <ht-quick-angular-table>
    model/
      index.ts
      table-settings.model.ts                  # TableSettings
      paginator-settings.model.ts              # DynamicMatTablePaginator + PaginatorSettings
      dynamic-mat-table.model.ts               # Dialog, TableState, DynamicTable
      dynamic-mat-table-action-settings.model.ts
      dynamic-mat-table-button.model.ts        # Icon, ButtonColor, DynamicMatTableButton
      dynamic-mat-table-filter.model.ts
      dynamic-mat-table-selection.model.ts
      dynamic-mat-table-columns/
        dynamic-mat-table-column.model.ts      # IDynamicMatTableColumn union, ColumnDataType
        private-dynamic-mat-table-column.model.ts
      dynamic-mat-table-data-interaction-settings/
        index.ts
        dynamic-mat-table-data-interaction-settings.model.ts
        dynamic-mat-table-add-settings/
          dynamic-mat-table-add-settings.model.ts
          new-data-item.model.ts               # NewDataItem* function wrappers
        dynamic-mat-table-delete-settings/
          dyanamic-mat-table-delete-settings.model.ts
        dynamic-mat-table-save-settings/
          dynamic-mat-table-save-settings.model.ts
          save-data-fn.model.ts
    backend/
      ht-backend.config.ts                     # BackendConfig + HT_BACKEND_CONFIG
      ht-backend.providers.ts                  # provideHtBackend
      ht-backend.service.ts                    # HtBackendService
      ht-backend.interceptor.ts                # bearer + refresh interceptor
    skills/
      skill.types.ts
      skill-registry.service.ts                # SkillRegistryService
      skill-menu.component.{ts,html,scss}      # <ht-skill-menu>
      sheet-select-dialog.component.{ts,html,scss}
      inputs/
        excel-input.component.{ts,html,scss}
        api-input.component.{ts,html,scss}
        database-input.component.{ts,html,scss}
    chart/
      chart.types.ts
      ht-table-chart.component.{ts,html,scss}  # <ht-table-chart>
    insights/
      insights.types.ts
      ht-table-insights.component.{ts,html,scss}  # <ht-table-insights>
    builder/
      builder.types.ts
      ht-table-builder.service.ts              # HtTableBuilderService
    agent/
      agent.types.ts
      ht-table-agent.service.ts                # HtTableAgentService<T>
      ht-table-agent.component.{ts,html,scss}  # <ht-table-agent>
backend/                                       # FastAPI service (Python 3.11+)
MIGRATION.md                                   # browser-AI → Python-backend migration
```

---

## Build & test

From the workspace root (never `cd projects/ht-quick-angular-table`):

```bash
npm run build:angular-table   # ng build ht-quick-angular-table
npm run test:angular-table    # ng test ht-quick-angular-table --watch=false
```

Adjust to the actual scripts in workspace `package.json`. The Python backend (`backend/`) ships its own `pyproject.toml` and is built/run separately — see `MIGRATION.md` for setup.
