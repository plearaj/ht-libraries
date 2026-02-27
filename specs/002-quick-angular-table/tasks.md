# Tasks: ht-quick-angular-table v2

**Input**: Design documents from `/specs/002-quick-angular-table/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Tests**: Not explicitly requested — constitution build gate (`ng test`) is enforced in Polish phase only.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Signal preference**: Use `signal()` / `computed()` / `effect()` for all component-local and derived state. Use RxJS only where signals are insufficient (service-bus `BehaviorSubject`, agent `concatMap` pipeline).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on tasks marked [P] in same batch)
- **[Story]**: Which user story this task belongs to (US1–US4)

---

## Phase 1: Setup (Package Configuration)

**Purpose**: Update package manifests so new bundled dependencies are declared before any source changes.

- [ ] T001 Update `projects/ht-quick-angular-table/ng-package.json` — set `allowedNonPeerDependencies` to `["@angular/material", "@angular/cdk", "chart.js", "ng2-charts", "@google/generative-ai", "@anthropic-ai/sdk"]` (remove `@ionic/angular`)
- [ ] T002 Update `projects/ht-quick-angular-table/package.json` — remove `@ionic/angular` from `peerDependencies`; add `chart.js`, `ng2-charts`, `@google/generative-ai`, `@anthropic-ai/sdk` as `dependencies`

---

## Phase 2: Foundational Prerequisites (Blocking All User Stories)

**Purpose**: Fix the Ionic violation and typo in existing code; create the AI provider infrastructure shared by US2–US4.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete and `ng build` passes.

- [ ] T003 Fix Ionic → Material imports in `projects/ht-quick-angular-table/src/lib/ht-quick-angular-table.component.ts` — remove `IonItem`, `IonInput`, `IonCheckbox`, `IonButton`, `IonIcon` from imports array and class imports; add `MatFormFieldModule`, `MatInputModule`, `MatCheckboxModule`, `MatButtonModule`, `MatIconModule`
- [ ] T004 Fix Ionic → Material in `projects/ht-quick-angular-table/src/lib/ht-quick-angular-table.component.html` — replace all `<ion-item>`, `<ion-input>`, `<ion-checkbox>`, `<ion-button>`, `<ion-icon>` tags with Material equivalents (`<mat-form-field>/<input matInput>`, `<mat-checkbox>`, `<button mat-button>`, `<mat-icon>`); replace filter `<ion-item>/<ion-input>` with `<mat-form-field><input matInput [formControl]="simpleFilterControl"></mat-form-field>`
- [ ] T005 Fix typo `etTableData` → `setTableData` in `projects/ht-quick-angular-table/src/lib/ht-quick-angular-table.service.ts` — rename the method and update all internal references
- [ ] T006 [P] Create `projects/ht-quick-angular-table/src/lib/ai/ai-model-adapter.interface.ts` — export `AiModelAdapter` interface with single method `generate(prompt: string): Promise<string>`
- [ ] T007 [P] Create `projects/ht-quick-angular-table/src/lib/ai/ai-provider.token.ts` — export `AiProviderConfig` discriminated union (`{ provider: 'gemini'; apiKey: string } | { provider: 'claude'; apiKey: string } | { provider: 'custom'; adapter: AiModelAdapter }`) and `HT_AI_PROVIDER = new InjectionToken<AiProviderConfig>('HT_AI_PROVIDER')`
- [ ] T008 Create `projects/ht-quick-angular-table/src/lib/ai/ai-provider.helpers.ts` — export `provideHtAi(config: AiProviderConfig): EnvironmentProviders` using `makeEnvironmentProviders([{ provide: HT_AI_PROVIDER, useValue: config }])`; import `HT_AI_PROVIDER` from `ai-provider.token.ts`
- [ ] T009 [P] Create `projects/ht-quick-angular-table/src/lib/ai/providers/gemini.provider.ts` — export `GeminiAdapter` class implementing `AiModelAdapter`; constructor accepts `apiKey: string`; `generate()` uses `@google/generative-ai` `GoogleGenerativeAI` client with model `'gemini-pro'` and returns `result.response.text()`
- [ ] T010 [P] Create `projects/ht-quick-angular-table/src/lib/ai/providers/claude.provider.ts` — export `ClaudeAdapter` class implementing `AiModelAdapter`; constructor accepts `apiKey: string`; instantiates Anthropic SDK with `{ apiKey, dangerouslyAllowBrowser: true }`; `generate()` calls `messages.create` with `model: 'claude-3-haiku-20240307'` and returns first text content block
- [ ] T011 Create `projects/ht-quick-angular-table/src/lib/ai/ai-adapter.factory.ts` — export `createAiAdapter(config: AiProviderConfig): AiModelAdapter` that returns a `GeminiAdapter`, `ClaudeAdapter`, or `config.adapter` depending on `config.provider`; used by all AI-consuming services to resolve the active adapter from the injected token
- [ ] T012 Update `projects/ht-quick-angular-table/src/public-api.ts` — add exports for: `AiModelAdapter`, `AiProviderConfig`, `HT_AI_PROVIDER`, `provideHtAi`
- [ ] T013 Run `ng build ht-quick-angular-table` — must pass with zero errors (foundational gate; blocks all user story work)

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 — Render a Complex Table from a Configuration Class (Priority: P1) 🎯 MVP

**Goal**: A developer constructs a `TableSettings` instance, calls `setTableSettings()` and `setTableData()`, adds `<ht-quick-angular-table>` to their template, and a fully functional Angular Material table renders with sort, filter, paginator, empty state, and row actions — no additional setup required.

**Independent Test**: `TableSettings` with 4 columns (text, number, date, boolean), 3 data rows, sort enabled, global filter, 5-row pagination → table renders with sort arrows, filter input, pagination controls, and empty-state message when data is cleared. No chart or AI features required.

### Implementation for User Story 1

- [ ] T014 [US1] Wire `MatSort` to `MatTableDataSource` in `projects/ht-quick-angular-table/src/lib/ht-quick-angular-table.component.ts` — implement `ngAfterViewInit()` to set `this.datasource().sort = this.sort()` and `this.datasource().paginator = this.paginator()`; add `MatSort` and `MatPaginator` to component imports; replace `OnInit`/`OnDestroy` lifecycle with signal-based subscriptions where possible
- [ ] T015 [US1] Add `mat-sort-header` to sortable column headers and `[matSort]` on `<mat-table>` in `projects/ht-quick-angular-table/src/lib/ht-quick-angular-table.component.html` — conditionally apply `mat-sort-header` only when `column.sortable` is true; bind `[disabled]="!column.sortable"` to prevent sorting on non-sortable columns
- [ ] T016 [US1] Implement empty-state display in `projects/ht-quick-angular-table/src/lib/ht-quick-angular-table.component.html` — add `<tr mat-no-data-row>` (using `*matNoDataRow` directive) containing a cell that spans all columns and displays `tableSettings.noRecordMessage`; show when datasource has no matching rows
- [ ] T017 [US1] Add `TableSettings` validation in `projects/ht-quick-angular-table/src/lib/model/table-settings.model.ts` — at the top of the `constructor`, if `columns` array is empty throw `new Error('[ht-quick-angular-table] TableSettings requires at least one column definition.')` before any other setup runs
- [ ] T018 [US1] Implement row action buttons in `projects/ht-quick-angular-table/src/lib/ht-quick-angular-table.component.html` — in the `action` column cell, render one `<button mat-icon-button>` per action option from `tableSettings.actionOptions`; each button emits the action identifier and row data via the service's `_rowSelected` or a new dedicated output; use `@for` over the action buttons list
- [ ] T019 [US1] Update `projects/ht-quick-angular-table/src/public-api.ts` — confirm all existing US1 symbols are exported: `HtQuickAngularTableComponent`, `HtQuickAngularTableService`, `TableSettings`, `DynamicMatTableColumn`, `DynamicMatTableFilter`, `DynamicMatTablePaginator`, `DynamicMatTableSelection`, `DynamicMatTableActionSettings`, `DynamicMatTableDataInteractionSettings`, `DynamicMatTableDataAddSettings`, `DynamicMatTableDeleteSettings`, `DynamicMatTableSaveSettings`, `provideHtQuickAngularTable`
- [ ] T020 [US1] Run `ng build ht-quick-angular-table` — must pass zero errors (US1 gate)

**Checkpoint**: US1 complete — table renders fully from `TableSettings` without any AI or chart features.

---

## Phase 4: User Story 2 — Visualize Table Data as Charts and AI-Generated Insights (Priority: P2)

**Goal**: `HtTableChartComponent` renders a bar/line/pie chart from a `ChartConfig` and a data array. `HtTableInsightsComponent` computes per-column statistics and optionally requests an AI-generated narrative via `HT_AI_PROVIDER`. Both update automatically when the data input changes.

**Independent Test**: Pass `ChartConfig { type: 'bar', xColumn: 'category', yColumns: ['quantity'] }` and an inventory data array → bar chart renders with correct bars. Update the data array → chart updates within 500 ms. Insights panel shows count/sum/avg/min/max for `quantity`. With `enableAiSummary: true` and no `HT_AI_PROVIDER`, an error message appears instead of a crash.

### Implementation for User Story 2

- [ ] T021 [P] [US2] Create `projects/ht-quick-angular-table/src/lib/chart/chart.types.ts` — export `ChartType = 'bar' | 'line' | 'pie'` and `ChartConfig` interface (`type`, `xColumn`, `yColumns: string[]`, `label?: string`) matching `data-model.md` §2
- [ ] T022 [P] [US2] Create `projects/ht-quick-angular-table/src/lib/insights/insights.types.ts` — export `InsightsConfig` interface (`statisticColumns?: string[]`, `enableAiSummary?: boolean`) and `ColumnStatistics` interface (`column`, `count`, `sum?`, `avg?`, `min?`, `max?`) matching `data-model.md` §3 and `contracts/component-api.ts`
- [ ] T023 [US2] Create `projects/ht-quick-angular-table/src/lib/chart/ht-table-chart.component.ts` — standalone `ChangeDetectionStrategy.OnPush` component with selector `ht-table-chart`; `config = input.required<ChartConfig>()`; `data = input.required<unknown[]>()`; use `computed()` to derive `ChartData` and `ChartOptions` from `config()` and `data()`; import and use `BaseChartDirective` from `ng2-charts`; map `ChartType` to ng2-charts chart type string; display error placeholder paragraph when xColumn/yColumn keys are missing from data rows; display "No data" placeholder when `data()` is empty
- [ ] T024 [US2] Create `projects/ht-quick-angular-table/src/lib/insights/ht-table-insights.component.ts` — standalone `ChangeDetectionStrategy.OnPush` component with selector `ht-table-insights`; `config = input.required<InsightsConfig>()`; `data = input.required<unknown[]>()`; use `computed()` to derive `ColumnStatistics[]` from `data()` and `config().statisticColumns`; when `enableAiSummary` is `true` optionally inject `HT_AI_PROVIDER` (use `inject(HT_AI_PROVIDER, { optional: true })`), create adapter via `createAiAdapter()`, call `generate()` with a structured data summary prompt; debounce AI calls 300 ms using `setTimeout`/`clearTimeout` to avoid redundant API calls during rapid data changes; store AI summary in a `signal<string>`; display "No data available." when `data()` is empty; display descriptive error message when `HT_AI_PROVIDER` is null and `enableAiSummary` is true
- [ ] T025 [US2] Update `projects/ht-quick-angular-table/src/public-api.ts` — add exports: `HtTableChartComponent`, `ChartConfig`, `ChartType`, `HtTableInsightsComponent`, `InsightsConfig`, `ColumnStatistics`
- [ ] T026 [US2] Run `ng build ht-quick-angular-table` — must pass zero errors (US2 gate)

**Checkpoint**: US2 complete — chart and insights components work with any `input()`-bound data array, independently of the table component.

---

## Phase 5: User Story 3 — Generate a Table Configuration from a Natural Language Description (Priority: P3)

**Goal**: `HtTableBuilderService.describe(prompt)` returns a `BuilderResult` containing a ready-to-use `TableSettings` instance (or a `clarification` question string) by sending a structured prompt to the AI adapter, parsing the JSON response, and constructing a `TableSettings` from it. `refine()` applies incremental changes preserving the rest of the configuration.

**Independent Test**: Call `describe('I need a table with user name, email, role, and registration date — sortable by date, 10 rows per page')` with a mock AI adapter that returns valid JSON → `result.tableSettings` passed to `tableService.setTableSettings()` renders the described table without errors.

### Implementation for User Story 3

- [ ] T027 [US3] Create `projects/ht-quick-angular-table/src/lib/builder/ht-table-builder.service.ts` — injectable service; `inject(HT_AI_PROVIDER, { optional: true })` for the token; create adapter via `createAiAdapter()`; maintain `private _sessionHistory = signal<BuilderMessage[]>([])`; expose `readonly sessionHistory = this._sessionHistory.asReadonly()`; implement `reset()` that clears `_sessionHistory`
- [ ] T028 [US3] Implement `describe(userMessage: string): Promise<BuilderResult>` in `projects/ht-quick-angular-table/src/lib/builder/ht-table-builder.service.ts` — throw if `HT_AI_PROVIDER` not registered; compose a system prompt that encodes the `TableSettings` constructor parameter types and all column/filter/paginator/action option classes in JSON schema form; append `userMessage` to session history; call `adapter.generate(fullPrompt)`; attempt to `JSON.parse` the response into a `TableSettings` constructor call; return `{ tableSettings }` on success; return `{ clarification }` when the response is a question or JSON parse fails; retry up to 3 times on parse failure before returning a clarification
- [ ] T029 [US3] Implement `refine(userMessage: string, current: unknown): Promise<BuilderResult>` in `projects/ht-quick-angular-table/src/lib/builder/ht-table-builder.service.ts` — serialise `current` (TableSettings) to a JSON summary of its current state; prepend it to the prompt as context so the AI knows what exists; apply the described change only; return `{ tableSettings }` with a new `TableSettings` instance reflecting the applied change
- [ ] T030 [US3] Update `projects/ht-quick-angular-table/src/public-api.ts` — add exports: `HtTableBuilderService`, `BuilderMessage`, `BuilderResult`; add interface declarations for `BuilderMessage` and `BuilderResult` in `projects/ht-quick-angular-table/src/lib/builder/builder.types.ts` if not already inline
- [ ] T031 [US3] Run `ng build ht-quick-angular-table` — must pass zero errors (US3 gate)

**Checkpoint**: US3 complete — developer can generate a working `TableSettings` from plain English, independently of charts and agent features.

---

## Phase 6: User Story 4 — Autonomous Agent Actions on Table Data (Priority: P4)

**Goal**: `HtTableAgentService<T>` evaluates row-level `(row: T) => boolean` and table-level `(rows: T[]) => boolean` trigger predicates, executes named action handlers sequentially via RxJS `concatMap` + `timeout()`, supports `on-demand`/`scheduled`/`reactive` run modes, and emits `actionCompleted`, `actionFailed`, `runCompleted`, and `warning` events. Second concurrent `run()` call is a no-op.

**Independent Test**: Configure mock `fetch-price` and `place-order` handlers; row-level trigger `quantity < 10`; next step condition `price <= 50`; dataset with one low-stock row (qty 5) and one normal row (qty 20). Call `run()` → `actionCompleted` emits once for `fetch-price` (low-stock row), `place-order` emits once (price ≤ 50). Normal row triggers nothing. `runCompleted` emits with `actionsInvoked: 2`.

### Implementation for User Story 4

- [ ] T032 [US4] Create `projects/ht-quick-angular-table/src/lib/agent/agent.types.ts` — export all types from `data-model.md` §4: `AgentActionContext<T>`, `AgentAction<T>`, `AgentNextStep`, `AgentTrigger<T>` (discriminated union with `scope: 'row' | 'table'`), `AgentRunMode`, `AgentConfig<T>`, `AgentRunResult`, `AgentActionEvent<T>`, `AgentFailureEvent<T>`
- [ ] T033 [US4] Create `projects/ht-quick-angular-table/src/lib/agent/ht-table-agent.service.ts` — injectable service; declare `EventEmitter` (or `OutputEmitterRef`) outputs: `actionCompleted`, `actionFailed`, `runCompleted`, `warning`; private `signal`-based state: `_config`, `_dataSource`, `_isRunning = signal(false)`, `_scheduleId`; implement `configure(config: AgentConfig<T>): void` — validate non-empty actions/triggers, unique action names, all `actionName` references resolve to registered actions, `scheduleIntervalMs > 0` when `runMode === 'scheduled'`; throw descriptive `Error` on any violation; store config in signal; start schedule or reactive effect when appropriate
- [ ] T034 [US4] Implement `run(): Promise<AgentRunResult>` in `projects/ht-quick-angular-table/src/lib/agent/ht-table-agent.service.ts` — if `_isRunning()` is true emit `warning('Agent run already in progress')` and return current run's promise; set `_isRunning(true)`; record start time; evaluate all **row-level** triggers: for each trigger where `scope === 'row'`, use `from(rows).pipe(filter(row => trigger.condition(row)), concatMap(row => this._executeChain(trigger, row, null)))` to invoke handlers sequentially per matching row; evaluate all **table-level** triggers: for each trigger where `scope === 'table'`, if `trigger.condition(rows)` is true invoke `this._executeChain(trigger, null, null)` once; collect `actionsInvoked` and `failures` counts; set `_isRunning(false)`; emit `runCompleted` with `AgentRunResult`; resolve returned Promise
- [ ] T035 [US4] Implement `_executeChain(trigger, row, previousResult)` private method in `projects/ht-quick-angular-table/src/lib/agent/ht-table-agent.service.ts` — look up handler by `trigger.actionName`; invoke `handler({ row, rows: allRows, previousResult })` wrapped in RxJS `from()` with `.pipe(timeout(config.timeoutMs ?? 30_000))`; on success emit `actionCompleted` and check `trigger.next` — if defined and `trigger.next.condition(result)` returns true, recursively invoke `_executeChain` for the next step with `previousResult = result`; on error/timeout emit `actionFailed` with `reason: 'timeout'` or `reason: error.message`; return Observable that always completes (use `catchError(() => EMPTY)`)
- [ ] T036 [US4] Implement `connectDataSource(fn: () => T[]): void` in `projects/ht-quick-angular-table/src/lib/agent/ht-table-agent.service.ts` — store the accessor function; for `reactive` run mode, set up an Angular `effect()` that calls `fn()` (reading the signal) and triggers `run()` when the data changes; for `scheduled` mode, start `setInterval(() => this.run(), config.scheduleIntervalMs)` and store the ID
- [ ] T037 [US4] Implement `stop(): void` in `projects/ht-quick-angular-table/src/lib/agent/ht-table-agent.service.ts` — clear the scheduled interval via `clearInterval(this._scheduleId)`; for reactive mode, destroy the effect ref; no-op for `on-demand` mode
- [ ] T038 [US4] Update `projects/ht-quick-angular-table/src/public-api.ts` — add exports: `HtTableAgentService`, `AgentConfig`, `AgentAction`, `AgentTrigger`, `AgentNextStep`, `AgentRunMode`, `AgentRunResult`, `AgentActionEvent`, `AgentFailureEvent`, `AgentActionContext`
- [ ] T039 [US4] Run `ng build ht-quick-angular-table` — must pass zero errors (US4 gate)

**Checkpoint**: US4 complete — all four user stories are independently implementable and testable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup, build verification, and test gate.

- [ ] T040 [P] Remove any `console.log` debug statements from all new and modified source files in `projects/ht-quick-angular-table/src/lib/` — search for `console.log` across `ai/`, `chart/`, `insights/`, `builder/`, `agent/`, `ht-quick-angular-table.component.ts`, `ht-quick-angular-table.service.ts`
- [ ] T041 [P] Verify `projects/ht-quick-angular-table/ng-package.json` `allowedNonPeerDependencies` contains exactly: `@angular/material`, `@angular/cdk`, `chart.js`, `ng2-charts`, `@google/generative-ai`, `@anthropic-ai/sdk` — no `@ionic/angular` remaining
- [ ] T042 [P] Verify `projects/ht-quick-angular-table/src/public-api.ts` — confirm all new public symbols are exported; confirm no internal implementation details (adapter factories, private helpers) are leaked
- [ ] T043 Run `ng build ht-quick-angular-table` — final build gate must pass with zero errors
- [ ] T044 Run `ng test ht-quick-angular-table` — all existing and any new Jasmine specs must pass; fix any failures before marking complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **blocks all user stories**
- **US1 (Phase 3)**: Depends on Phase 2 completion — no dependencies on US2/US3/US4
- **US2 (Phase 4)**: Depends on Phase 2 completion — no dependency on US1 (uses `input()`-based API, not service bus)
- **US3 (Phase 5)**: Depends on Phase 2 completion (needs `HT_AI_PROVIDER`) — no dependency on US1/US2
- **US4 (Phase 6)**: Depends on Phase 2 completion (needs `HT_AI_PROVIDER`, `AgentConfig`) — no dependency on US1/US2/US3
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1**: Independent after Phase 2
- **US2**: Independent after Phase 2; may share `HT_AI_PROVIDER` adapter with US3/US4 but does not depend on them
- **US3**: Independent after Phase 2; depends on `HT_AI_PROVIDER` infrastructure (T006-T011)
- **US4**: Independent after Phase 2; depends on `HT_AI_PROVIDER` infrastructure and agent types

### Parallel Opportunities Within Foundational Phase

After T003–T005 (Ionic fix + typo fix), T006 and T007 can run in parallel (different files). After T006+T007, T008+T009+T010 can all run in parallel. T011 and T012 are sequential last.

### Parallel Opportunities Within US2

T021 (chart types) and T022 (insights types) can run in parallel. T023 depends on T021; T024 depends on T022+T011.

---

## Parallel Example: Phase 2 (Foundational AI Infrastructure)

```text
# After T003 (Ionic .ts) and T004 (Ionic .html) are done:

Parallel batch A (no dependencies on each other):
  Task T006: Create ai-model-adapter.interface.ts
  Task T007: Create ai-provider.token.ts

# After T006 + T007 complete:

Parallel batch B:
  Task T008: Create ai-provider.helpers.ts     (needs T007)
  Task T009: Create gemini.provider.ts         (needs T006)
  Task T010: Create claude.provider.ts         (needs T006)

# After T008 + T009 + T010 complete:
  Task T011: Create ai-adapter.factory.ts
  Task T012: Update public-api.ts
  Task T013: ng build gate
```

## Parallel Example: US2 (Charts & Insights)

```text
Parallel batch (no dependencies on each other):
  Task T021: Create chart.types.ts
  Task T022: Create insights.types.ts

Sequential after T021:
  Task T023: Create ht-table-chart.component.ts

Sequential after T022 + T011:
  Task T024: Create ht-table-insights.component.ts
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: US1 — Core Table
4. **STOP and VALIDATE**: Confirm table renders with sort, filter, pagination, empty state, row actions
5. Build and demo — this is the independently shippable MVP

### Incremental Delivery

1. Setup + Foundational → infrastructure ready
2. US1 → fully functional Material table (demo-able)
3. US2 → charts + insights alongside the table (demo-able)
4. US3 → AI config builder (demo-able with mock prompts)
5. US4 → autonomous agent (demo-able with mock handlers)
6. Polish → clean build + all tests pass → publishable

### Suggested MVP Scope

**US1 alone** is the publishable MVP. Each subsequent story adds value without breaking the previous one.

---

## Notes

- All new source files go in `projects/ht-quick-angular-table/src/lib/` — never workspace root
- Every component must use `ChangeDetectionStrategy.OnPush` and `standalone: true`
- Use `inject()` — constructor injection is forbidden (constitution §II)
- Use `input()`/`output()` — decorator `@Input`/`@Output` must not appear in new code
- Use `@if`/`@for`/`@switch` — structural directives `*ngIf`/`*ngFor` must not appear in new code
- Use `signal()`/`computed()` for all component-local and derived state
- RxJS allowed only for: service `BehaviorSubject` bus, agent `concatMap`/`timeout` pipeline
- `ng build` gate must pass after every phase before moving to the next
