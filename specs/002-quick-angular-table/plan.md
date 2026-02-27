# Implementation Plan: ht-quick-angular-table v2

**Branch**: `002-quick-angular-table` | **Date**: 2026-02-27 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-quick-angular-table/spec.md`

## Summary

Extend the existing `ht-quick-angular-table` Angular library with four user-story layers built on top of the existing service-bus pattern (`HtQuickAngularTableService` + `HtQuickAngularTableComponent`):

1. **US1 — Core Table (P1 MVP)**: Fix the Ionic dependency violation in the existing component, correct the `etTableData` typo, and deliver a fully functional Angular Material table driven by `TableSettings`. Existing model infrastructure (`DynamicMatTableColumn`, `DynamicMatTableFilter`, etc.) is preserved.
2. **US2 — Charts & Insights (P2)**: Add `HtTableChartComponent` (ng2-charts + Chart.js) and `HtTableInsightsComponent` (statistics + optional AI narrative) as standalone companion components.
3. **US3 — AI Config Builder (P3)**: Add `HtTableBuilderService` that accepts natural-language descriptions and returns ready-to-use `TableSettings` instances via the `HT_AI_PROVIDER` InjectionToken system.
4. **US4 — Autonomous Agent (P4)**: Add `HtTableAgentService<T>` that evaluates row-level and table-level trigger predicates and executes sequential multi-step action pipelines on matching data, with scheduled/on-demand run modes.

## Technical Context

**Language/Version**: TypeScript 5.6 / Angular 21
**Primary Dependencies** (bundled in `allowedNonPeerDependencies`):
- `@angular/material` (bundled) — table, sort, paginator, input, checkbox, button, icon, progress-bar
- `chart.js` + `ng2-charts` — charting (bar, line, pie, doughnut; ~16-19 KB gzipped, MIT, ng-packagr safe)
- `@google/generative-ai` — Gemini browser-native SDK (no extra config needed)
- `@anthropic-ai/sdk` — Claude SDK (requires `dangerouslyAllowBrowser: true` constructor flag)
- `rxjs` — peer dependency (already present in every Angular app)

**Storage**: None (stateless library; caller owns data)
**Testing**: Karma + Jasmine (`ng test ht-quick-angular-table`)
**Target Platform**: Browser (Angular 21 standalone, zoneless-ready)
**Performance Goals**: Chart renders/updates ≤ 500 ms of data change; AI builder responds in ≤ 10 s for ≤ 10 columns
**Reactive State**: Use Angular `signal()` / `computed()` for component-local and derived state; RxJS Observables only where signals are insufficient (e.g., `BehaviorSubject` in the service bus, RxJS operators in the agent pipeline)
**Constraints**: Build must pass `ng build ht-quick-angular-table` with zero errors; no Ionic imports allowed
**Scale/Scope**: Single Angular library (`projects/ht-quick-angular-table/`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Library-First Architecture | ✅ PASS | All work inside `projects/ht-quick-angular-table/`; exported via `public-api.ts` |
| II. Modern Angular Patterns | ⚠️ PREREQUISITE FIX REQUIRED | Existing component uses Ionic (`IonItem`, `IonInput`, `IonCheckbox`, `IonButton`, `IonIcon`) and decorator-based patterns — must be replaced with Material equivalents and signal APIs as Task T001 |
| II. Modern Angular Patterns (new code) | ✅ PASS | All new components/services use `inject()`, `input()`/`output()`, `ChangeDetectionStrategy.OnPush`, `@if`/`@for` |
| III. Minimal & Stable Public API | ✅ PASS | Existing `setTableSettings`/`setTableData` signatures preserved; new symbols are additive only |
| III. allowedNonPeerDependencies | ✅ PASS (pending update) | `ng-package.json` must list `chart.js`, `ng2-charts`, `@google/generative-ai`, `@anthropic-ai/sdk` |
| IV. Build & Test Gate | ✅ PASS | `ng build` + `ng test` required before task completion |
| V. DRY, YAGNI, KISS | ✅ PASS | No speculative generics; AI provider interface minimised to `generate(prompt): Promise<string>`; agent pipeline uses standard RxJS operators |

**Prerequisite violation (Ionic)**: Documented in Complexity Tracking below. This is a fix of existing non-compliant code, not a new violation.

## Project Structure

### Documentation (this feature)

```text
specs/002-quick-angular-table/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── component-api.ts ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
projects/ht-quick-angular-table/
├── ng-package.json                    ← add chart.js, ng2-charts, AI SDKs to allowedNonPeerDependencies
├── package.json
└── src/
    ├── public-api.ts                  ← export all new public symbols
    └── lib/
        │
        ├── # EXISTING (fix + preserve)
        ├── ht-quick-angular-table.component.ts    ← replace Ionic → Material; fix typo etTableData
        ├── ht-quick-angular-table.service.ts      ← fix etTableData → setTableData
        ├── ht-quick-angular-table.providers.ts    ← provideHtQuickAngularTable() (unchanged)
        │
        ├── model/
        │   └── index.ts               ← existing models preserved; new types added
        │
        ├── # NEW: AI provider system
        ├── ai/
        │   ├── ai-provider.token.ts   ← HT_AI_PROVIDER InjectionToken<AiProviderConfig>
        │   ├── ai-adapter.interface.ts← AiModelAdapter { generate(prompt): Promise<string> }
        │   └── ai-provider.helpers.ts ← provideHtAi(config) helper
        │
        ├── # NEW: Charts
        ├── chart/
        │   ├── ht-table-chart.component.ts        ← HtTableChartComponent (standalone, OnPush)
        │   └── chart.types.ts                     ← ChartConfig, ChartType
        │
        ├── # NEW: Insights
        ├── insights/
        │   ├── ht-table-insights.component.ts     ← HtTableInsightsComponent (standalone, OnPush)
        │   └── insights.types.ts                  ← InsightsConfig, StatResult
        │
        ├── # NEW: AI Builder
        ├── builder/
        │   └── ht-table-builder.service.ts        ← HtTableBuilderService
        │
        └── # NEW: Autonomous Agent
            └── agent/
                ├── ht-table-agent.service.ts      ← HtTableAgentService<T>
                └── agent.types.ts                 ← AgentConfig, AgentAction, AgentTrigger, AgentRunMode, AgentEvent
```

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Ionic imports in existing component | Legacy code written against wrong target; being removed as prerequisite fix | Cannot tree-shake Ionic from a Material library — consumer apps without Ionic would break |
| `dangerouslyAllowBrowser: true` for Claude SDK | Anthropic SDK requires this flag for any browser-side use | No workaround exists; the flag is an explicit opt-in, not a security hole, and is documented in quickstart |

## Implementation Phases

### Phase 0 — Prerequisites & Infrastructure (blocking all user stories)

**Goal**: Fix existing violations so the library builds and the service contract is stable.

1. Fix Ionic → Material in `ht-quick-angular-table.component.ts`
   - Replace `IonItem` wrapper → `<div>` or `<mat-form-field>`
   - Replace `IonInput` → `<input matInput>`
   - Replace `IonCheckbox` → `<mat-checkbox>`
   - Replace `IonButton` → `<button mat-button>` / `<button mat-icon-button>`
   - Replace `IonIcon` → `<mat-icon>`
   - Remove all `@ionic/angular` imports from component
2. Fix typo: `etTableData` → `setTableData` in `ht-quick-angular-table.service.ts` and all internal usages
3. Add `chart.js`, `ng2-charts`, `@google/generative-ai`, `@anthropic-ai/sdk` to `ng-package.json` `allowedNonPeerDependencies`
4. Create `ai/ai-provider.token.ts` — `HT_AI_PROVIDER` InjectionToken + `AiModelAdapter` interface + `AiProviderConfig` discriminated union
5. Create `ai/ai-provider.helpers.ts` — `provideHtAi(config: AiProviderConfig): EnvironmentProviders`
6. Add new type exports to `model/index.ts`: `ChartConfig`, `InsightsConfig`, `AgentAction`, `AgentTrigger`, `AgentConfig`, `AgentRunMode`, `AgentEvent`
7. Update `public-api.ts` — export all new symbols
8. **Gate**: `ng build ht-quick-angular-table` must pass with zero errors

### Phase 1 — US1: Core Table (P1 MVP)

**Goal**: Fully functional Angular Material table from `TableSettings` — sort, filter, paginate, empty state, row actions.

All infrastructure changes from Phase 0 make this independently testable.

**Independent test**: Pass `TableSettings` with 4 columns + 3 data rows → table renders with sort arrows, filter input, pagination, and empty-state message when data is cleared.

Key tasks:
- Ensure `HtQuickAngularTableComponent` renders all `DynamicMatTableColumn` types correctly with `ChangeDetectionStrategy.OnPush`
- Validate empty-state message from `TableSettings` constructor arg
- Validate descriptive error thrown when `columns` array is empty at `setTableSettings()` call
- Write Jasmine specs: renders columns, sort, filter, paginate, empty state, invalid config error

**Gate**: `ng build` + `ng test` pass

### Phase 2 — US2: Charts & Insights (P2)

**Goal**: `HtTableChartComponent` renders bar/line/pie/doughnut from `ChartConfig + data[]`; `HtTableInsightsComponent` shows statistics and optional AI narrative.

**Independent test**: Pass `ChartConfig { type: 'bar', xColumn: 'category', yColumns: ['quantity'] }` + data signal → bar chart renders. Change data signal → chart updates within 500 ms.

Key tasks:
- `chart/chart.types.ts` — `ChartConfig`, `ChartType` union
- `chart/ht-table-chart.component.ts` — `input()` for `config` and `data`; uses `ng2-charts` `BaseChartDirective`; derives `ChartData` and `ChartOptions` from `ChartConfig`; updates on `data` input change via `computed()`
- `insights/insights.types.ts` — `InsightsConfig`, `StatResult { column, count, sum, avg, min, max }`
- `insights/ht-table-insights.component.ts` — computes statistics per `statisticColumns`; when `enableAiSummary: true` and `HT_AI_PROVIDER` is provided, calls `AiModelAdapter.generate()` and displays result; shows graceful error when AI not configured but `enableAiSummary: true`
- Write Jasmine specs: chart renders, insights statistics correct, AI error state graceful

**Gate**: `ng build` + `ng test` pass

### Phase 3 — US3: AI Config Builder (P3)

**Goal**: `HtTableBuilderService.describe(prompt)` returns `{ tableSettings: TableSettings }` or `{ clarification: string }` within 10 s for ≤ 10 columns.

**Independent test**: Call `builder.describe('I need a table with name, email, signup date, sortable by date, 10 rows per page')` → returns valid `TableSettings` that renders correctly when passed to `tableService.setTableSettings()`.

Key tasks:
- `builder/ht-table-builder.service.ts` — `inject(HT_AI_PROVIDER)` optional; composes JSON schema prompt describing `TableSettings` structure; parses response; falls back to `clarification` when JSON invalid; supports `refine(prompt, currentSettings)` for incremental updates
- System prompt encodes the full `TableSettings` constructor signature so the AI returns a structured JSON payload
- Write Jasmine specs: valid response returns `TableSettings`, invalid response returns `clarification`, `refine()` preserves unchanged fields

**Gate**: `ng build` + `ng test` pass (AI calls mocked in tests)

### Phase 4 — US4: Autonomous Agent (P4)

**Goal**: `HtTableAgentService<T>` evaluates row-level `(row: T) => boolean` and table-level `(rows: T[]) => boolean` trigger predicates; executes named action handlers sequentially via RxJS `concatMap`; supports `runMode: 'scheduled' | 'on-demand'`; emits `actionCompleted`, `actionFailed`, `runCompleted`, and `warning` events.

**Independent test**: Register `fetch-best-price` and `place-order` actions with a `row`-scope trigger `quantity < 10`; provide dataset; call `agent.run()` → `actionCompleted` emits for matching rows; `place-order` invoked only when `price <= 50`.

Key tasks:
- `agent/agent.types.ts` — `AgentAction<T>`, `AgentTrigger<T>` (discriminated union `scope: 'row' | 'table'`), `AgentConfig<T>`, `AgentRunMode`, `AgentEvent`, `AgentRunResult`
- `agent/ht-table-agent.service.ts`:
  - `configure(config: AgentConfig<T>)` — stores config
  - `connectDataSource(fn: () => T[])` — stores data accessor
  - `run(): void` — no-op + `warning` emit if already running; evaluates row-triggers per-row and table-trigger once against all rows; uses `from(matchedRows).pipe(concatMap(row => executeChain(row)), timeout(config.timeoutMs))` for row scope; emits `actionFailed` with `reason: 'timeout'` on timeout
  - `stop()` — cancels scheduled interval; unsubscribes active run
  - Scheduled mode: `setInterval` wrapper that calls `run()` every `scheduleIntervalMs`
  - EventEmitters: `actionCompleted`, `actionFailed`, `runCompleted`, `warning`
- Write Jasmine specs: all 7 validation checklist items from `quickstart.md`

**Gate**: `ng build` + `ng test` pass

### Phase 5 — Polish & Cross-Cutting

1. Remove any `console.log` debug statements introduced during development
2. Verify `ng-package.json` `allowedNonPeerDependencies` is accurate and complete
3. Ensure `public-api.ts` exports all public symbols and no internal implementation details
4. Run `npm run lint` and `npm run format` (if configured)
5. Final `ng build ht-quick-angular-table` + `ng test ht-quick-angular-table` — must be zero errors/failures

## Post-Design Constitution Re-evaluation

After Phase 1 design artifacts (data-model.md, contracts/, quickstart.md) are complete:

| Principle | Re-check Status | Notes |
|-----------|----------------|-------|
| I. Library-First | ✅ PASS | All new code in `projects/ht-quick-angular-table/src/lib/` |
| II. Modern Angular (new code) | ✅ PASS | All new components use `input()`, `output()`, `OnPush`, `inject()`, `@if`/`@for` |
| III. Public API stability | ✅ PASS | `setTableSettings`/`setTableData` signatures unchanged; new services are additive |
| III. allowedNonPeerDependencies | ✅ PASS | Updated in `ng-package.json` as Phase 0 task |
| IV. Build & Test Gate | ✅ PASS | Gate enforced at end of each phase |
| V. DRY | ✅ PASS | `AiModelAdapter` shared by both `HtTableInsightsComponent` and `HtTableBuilderService` via `HT_AI_PROVIDER` token |
| V. YAGNI | ✅ PASS | No optional generics or speculative configs; `enableAiSummary` only activates when explicitly `true` |
| V. KISS | ✅ PASS | Agent pipeline is standard RxJS; chart derives `ChartData` from 3-field `ChartConfig`; builder prompt is a string |
