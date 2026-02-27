# Research: ht-quick-angular-table v2

**Branch**: `002-quick-angular-table` | **Date**: 2026-02-27

---

## Decision 1: Charting Library

**Decision**: `chart.js@^4.4` + `ng2-charts@^5.0`

**Rationale**:
- Smallest bundle impact (~16-19 KB gzipped combined) of all viable options
- MIT licensed
- ng2-charts v5+ supports Angular 14+ standalone components and OnPush
- `BaseChartDirective` imports cleanly into standalone components
- No known ng-packagr issues; `chart.js` can be listed in `allowedNonPeerDependencies`
- Covers all required chart types: bar, line, pie

**Alternatives considered**:
- **ngx-echarts + Apache ECharts**: ~60-75 KB — 3-4× larger bundle, overkill for bar/line/pie
- **D3.js**: Too low-level; would require significant wrapper code
- **Highcharts**: Commercial license, excluded

**ng-package.json update required**:
```json
"allowedNonPeerDependencies": ["@angular/material", "@angular/cdk", "chart.js", "ng2-charts"]
```

---

## Decision 2: AI SDK Browser Compatibility

### Google Gemini

**Decision**: `@google/generative-ai` (latest, currently ^0.11.x)

**Rationale**:
- Explicitly designed for browser and client-side JavaScript
- Uses the Fetch API; no Node.js-specific dependencies
- CORS is supported by Google's Gemini API endpoints
- API key exposure is officially supported by Google (with domain-restriction guidance)
- Bundles cleanly into Angular libraries via ng-packagr

**Security guidance for consumers**:
- Restrict the API key in Google Cloud Console to specific HTTP referrer domains
- Use environment files to inject the key; never commit to source control

### Anthropic Claude

**Decision**: `@anthropic-ai/sdk` (latest, currently ^0.28.x) with `dangerouslyAllowBrowser: true`

**Rationale**:
- The SDK's `dangerouslyAllowBrowser` constructor flag explicitly enables browser use
- Anthropic acknowledges this use case for developer tools and internal apps
- Plain Fetch calls to `api.anthropic.com` work from browsers when `x-api-key` header is set
- The flag makes the security tradeoff explicit to the consumer

**Security guidance for consumers**:
- Only use the Claude built-in provider for internal tools, dev utilities, or apps where
  users supply their own API keys
- For public-facing apps: use the BYOM adapter backed by a backend proxy

**ng-package.json update required**:
```json
"allowedNonPeerDependencies": ["@anthropic-ai/sdk", "@google/generative-ai", ...]
```

---

## Decision 3: AI Provider InjectionToken Pattern

**Decision**: Single Angular `InjectionToken<AiProviderConfig>` registered once in `app.config.ts` via a `provideHtAi(config)` helper function.

**Rationale**:
- Idiomatic Angular pattern (same pattern as `provideFirebaseApp`, `provideHttpClient`)
- Provider is configured once; all AI services (`HtTableBuilderService`, `HtTableAgentService`,
  `HtTableInsightsComponent`) inject the same token — no per-instance key passing
- Enables test-time mocking by overriding the token in `TestBed`
- Three modes via discriminated union:
  ```typescript
  type AiProviderConfig =
    | { provider: 'gemini'; apiKey: string }
    | { provider: 'claude'; apiKey: string }
    | { provider: 'custom'; adapter: AiModelAdapter };
  ```

**Alternatives considered**:
- Per-instance config on `InsightsConfig` / `AgentConfig`: Creates repetitive setup and can't
  be easily mocked or swapped globally. Rejected.
- Environment variable injection: Not possible at library level. Rejected.

---

## Decision 4: Existing Service-Bus Pattern

**Decision**: Preserve the existing `HtQuickAngularTableService` service-bus pattern for the table component. Add `input()`-based patterns for new components (chart, insights).

**Rationale**:
- Breaking the existing component's API would be a constitution violation (Principle III)
- The service-bus pattern (`setTableSettings`, `setTableData`) is the established public API
- New components (chart, insights) will use `input()` for clean composition with any data source

**Bug fix required**: `HtQuickAngularTableService.etTableData()` → `setTableData()` (typo).

---

## Decision 5: Ionic Dependency Removal

**Decision**: Replace all Ionic components in `ht-quick-angular-table.component.ts` with Angular Material equivalents.

**Rationale**:
- The spec requires this library to work in any Angular 21 app, not just Ionic apps
- Current imports (`IonItem`, `IonInput`, `IonCheckbox`, `IonButton`, `IonIcon`) create an
  undeclared dependency on `@ionic/angular`
- Replacement mapping:
  - `IonInput` (filter) → `MatFormField` + `MatInput`
  - `IonCheckbox` (selection) → `MatCheckbox`
  - `IonButton` → `MatButton`
  - `IonIcon` → `MatIcon`
  - `IonItem` (layout wrapper) → `div` with Material styling or `MatListItem`
- Angular Material is already bundled; adding these modules costs nothing

---

## Decision 6: Agent Sequential Multi-Step Implementation

**Decision**: Observable pipeline using RxJS `switchMap` / `concatMap` for sequential steps.

**Rationale**:
- The agent needs to: evaluate trigger → invoke handler → optionally evaluate follow-up
  condition using handler result → invoke follow-up handler
- RxJS `concatMap` provides backpressure-safe sequential execution
- `from(Promise)` bridges consumer-provided async handler functions into the Observable chain
- Timeout handled with `timeout()` operator from RxJS

**Pattern**:
```typescript
// Row-level trigger pipeline (simplified)
from(rows).pipe(
  filter(row => trigger.condition(row)),
  concatMap(row => from(trigger.action.handler({ row })).pipe(
    timeout(config.timeoutMs ?? 30_000),
    tap(result => this.actionCompleted.emit({ action: trigger.action.name, row, result })),
    catchError(err => { this.actionFailed.emit(...); return EMPTY; })
  ))
)
```

---

## Decision 7: Project Structure

**Decision**: Extend `projects/ht-quick-angular-table/src/lib/` with new subdirectories alongside existing code.

```
src/lib/
├── model/              # EXISTING — keep; extend TableSettings if needed
├── chart/              # NEW
│   ├── chart-config.model.ts
│   └── ht-table-chart.component.ts
├── insights/           # NEW
│   ├── insights-config.model.ts
│   └── ht-table-insights.component.ts
├── ai/                 # NEW
│   ├── ai-provider.token.ts
│   ├── ai-model-adapter.interface.ts
│   ├── providers/
│   │   ├── gemini.provider.ts
│   │   └── claude.provider.ts
│   └── ht-table-builder.service.ts
├── agent/              # NEW
│   ├── agent-config.model.ts
│   └── ht-table-agent.service.ts
├── ht-quick-angular-table.component.ts  # EXISTING — fix Ionic → Material, fix typo
├── ht-quick-angular-table.service.ts    # EXISTING — fix etTableData typo
└── ht-quick-angular-table.providers.ts # EXISTING — extend with provideHtAi()
```
