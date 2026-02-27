# Data Model: ht-quick-angular-table v2

**Branch**: `002-quick-angular-table` | **Date**: 2026-02-27

---

## Overview

The library's type system is structured in three layers:
1. **Existing model layer** (`model/`) — `TableSettings`, `DynamicMatTableColumn`, filter/paginator/action classes — **preserved unchanged**
2. **New configuration types** — `ChartConfig`, `InsightsConfig`, `AgentConfig`, `AiProviderConfig`
3. **AI provider system** — `AiModelAdapter` interface, provider implementations

---

## 1. AI Provider System

### `AiModelAdapter` (interface)

The minimal contract that all AI model adapters must satisfy.

```typescript
// src/lib/ai/ai-model-adapter.interface.ts
export interface AiModelAdapter {
  /**
   * Send a prompt string and receive a text response.
   * Must return a resolved Promise<string> on success.
   * Must return a rejected Promise on failure.
   */
  generate(prompt: string): Promise<string>;
}
```

**Validation rules**:
- Must be provided when `AiProviderConfig.provider === 'custom'`
- The library does not validate the adapter's output format; it receives raw strings

---

### `AiProviderConfig` (discriminated union)

Registered via `HT_AI_PROVIDER` `InjectionToken`. One of three shapes:

```typescript
// src/lib/ai/ai-provider.token.ts
export type AiProviderConfig =
  | { provider: 'gemini'; apiKey: string }
  | { provider: 'claude'; apiKey: string }
  | { provider: 'custom'; adapter: AiModelAdapter };

export const HT_AI_PROVIDER = new InjectionToken<AiProviderConfig>('HT_AI_PROVIDER');
```

**Validation rules**:
- `apiKey` must be a non-empty string when `provider` is `'gemini'` or `'claude'`
- `adapter.generate` must be a function when `provider` is `'custom'`
- If `HT_AI_PROVIDER` is not registered and an AI feature is used, the service MUST throw a
  descriptive `Error` at first use — not at injection time (provider may be omitted in apps
  that only use the core table without AI features)

**Lifecycle**: Singleton per Angular injector (registered in `app.config.ts`).

---

## 2. Chart Configuration

### `ChartConfig` (interface)

Passed as `input()` to `HtTableChartComponent`.

```typescript
// src/lib/chart/chart-config.model.ts
export type ChartType = 'bar' | 'line' | 'pie';

export interface ChartConfig {
  /** Chart type to render */
  type: ChartType;
  /**
   * Key of the table column whose values form the x-axis labels (bar/line)
   * or slice labels (pie). Must be a key of the data row type T.
   */
  xColumn: string;
  /**
   * One or more column keys whose numeric values form the datasets.
   * For pie charts only one column is used (first element).
   */
  yColumns: string[];
  /** Optional display label for the chart (used in legend/title) */
  label?: string;
}
```

**Validation rules**:
- `xColumn` must be a string matching one of the table column's `columnDataName` values
- `yColumns` must contain at least one element
- For pie charts, only the first element of `yColumns` is used; extra elements are ignored
- If a `yColumn` resolves to non-numeric data, the chart renders an error placeholder

**State transitions**: Stateless configuration — the chart re-renders whenever `data` input changes.

---

## 3. Insights Configuration

### `InsightsConfig` (interface)

Passed as `input()` to `HtTableInsightsComponent`.

```typescript
// src/lib/insights/insights-config.model.ts
export interface InsightsConfig {
  /**
   * Column keys for which to display computed summary statistics
   * (count, sum, average, min, max). Only numeric columns produce
   * meaningful statistics; string/date columns show count only.
   */
  statisticColumns?: string[];
  /**
   * When true, the component requests an AI-generated natural-language
   * summary of the current dataset. Requires HT_AI_PROVIDER to be registered.
   */
  enableAiSummary?: boolean;
}
```

**Validation rules**:
- `statisticColumns` defaults to `[]` if omitted (no statistics displayed)
- `enableAiSummary` defaults to `false` if omitted
- If `enableAiSummary` is `true` and `HT_AI_PROVIDER` is not registered, the component
  displays an error message in the summary panel instead of throwing

---

## 4. Agent Configuration

### `AgentActionContext<T>` (interface)

Passed to each action handler when invoked.

```typescript
// src/lib/agent/agent-config.model.ts
export interface AgentActionContext<T> {
  /** The data row that satisfied the trigger condition (row-level triggers only; null for table-level) */
  row: T | null;
  /** All rows in the current dataset (always populated) */
  rows: T[];
  /** The result of the preceding action in a multi-step chain (null for first action) */
  previousResult: unknown | null;
}
```

---

### `AgentAction<T>` (interface)

A named, consumer-provided action handler.

```typescript
export interface AgentAction<T> {
  /** Unique name used to reference this action from AgentTrigger.actionName */
  name: string;
  /**
   * The handler function. Must return a Promise that resolves with the action result
   * (used in subsequent step evaluation) or rejects to signal failure.
   */
  handler: (context: AgentActionContext<T>) => Promise<unknown>;
}
```

**Validation rules**:
- `name` must be unique within a single `AgentConfig`; duplicate names throw at service init
- `handler` must be a function; it receives `AgentActionContext` and must return a Promise

---

### `AgentNextStep` (interface)

Defines a follow-up condition-action pair in a sequential multi-step chain.

```typescript
export interface AgentNextStep<T = unknown> {
  /**
   * Condition evaluated against the preceding action's result.
   * (previousResult: T) => boolean
   */
  condition: (previousResult: T) => boolean;
  /** Name of the AgentAction to invoke when condition returns true */
  actionName: string;
}
```

---

### `AgentTrigger<T>` (discriminated union)

Two scopes: row-level and table-level.

```typescript
export type AgentTrigger<T> =
  | {
      scope: 'row';
      /** Predicate evaluated against each row; handler invoked once per matching row */
      condition: (row: T) => boolean;
      /** Name of the AgentAction to invoke */
      actionName: string;
      /** Optional follow-up step using the first action's result */
      next?: AgentNextStep;
    }
  | {
      scope: 'table';
      /** Predicate evaluated once against the full dataset */
      condition: (rows: T[]) => boolean;
      /** Name of the AgentAction to invoke */
      actionName: string;
      /** Optional follow-up step using the first action's result */
      next?: AgentNextStep;
    };
```

---

### `AgentRunMode` (type)

```typescript
export type AgentRunMode =
  | 'on-demand'   // Agent runs only when run() is called explicitly
  | 'scheduled'   // Agent runs at a fixed interval (scheduleIntervalMs required)
  | 'reactive';   // Agent re-runs automatically when the data source changes
```

---

### `AgentConfig<T>` (interface)

Top-level configuration object for `HtTableAgentService`.

```typescript
export interface AgentConfig<T> {
  /** Registered action handlers — must have unique names */
  actions: AgentAction<T>[];
  /** Trigger conditions mapped to action names */
  triggers: AgentTrigger<T>[];
  /** How the agent is run */
  runMode: AgentRunMode;
  /** Required when runMode is 'scheduled'; milliseconds between runs */
  scheduleIntervalMs?: number;
  /** Maximum milliseconds to wait for a handler to resolve before emitting actionFailed */
  timeoutMs?: number; // default: 30_000
}
```

**Validation rules**:
- `actions` must contain at least one entry
- `triggers` must contain at least one entry; each `actionName` must reference a registered action
- `scheduleIntervalMs` is required and must be > 0 when `runMode === 'scheduled'`
- Duplicate `actions[].name` values throw a descriptive Error at service init time

---

### `AgentRunResult` (interface — event payload)

Emitted as `runCompleted` at the end of each agent run.

```typescript
export interface AgentRunResult {
  triggersEvaluated: number;
  actionsInvoked: number;
  failures: number;
  durationMs: number;
}
```

---

### `AgentActionEvent<T>` (interface — event payload)

Emitted as `actionCompleted`.

```typescript
export interface AgentActionEvent<T> {
  actionName: string;
  row: T | null;       // null for table-level triggers
  result: unknown;
}
```

---

### `AgentFailureEvent<T>` (interface — event payload)

Emitted as `actionFailed`.

```typescript
export interface AgentFailureEvent<T> {
  actionName: string;
  row: T | null;
  reason: string;
  error?: unknown;
}
```

---

## 5. Existing Entities (preserved, not modified)

These entities are defined in `src/lib/model/` and remain unchanged:

| Entity | File | Role |
|--------|------|------|
| `TableSettings` | `table-settings.model.ts` | Main table config class (existing) |
| `DynamicMatTableColumn` | `dynamic-mat-table-column.model.ts` | Column definition class |
| `DynamicMatTableFilter` | `dynamic-mat-table-filter.model.ts` | Filter config |
| `DynamicMatTablePaginator` | `paginator-settings.model.ts` | Pagination config |
| `DynamicMatTableSelection` | `dynamic-mat-table-selection.model.ts` | Row selection config |
| `DynamicMatTableActionSettings` | `dynamic-mat-table-action-settings.model.ts` | Action column config |
| `DynamicMatTableDataInteractionSettings` | `dynamic-mat-table-data-interaction-settings.model.ts` | Add/delete/save config |

---

## 6. Entity Relationship Summary

```
AiProviderConfig ──registered via──> HT_AI_PROVIDER InjectionToken
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    ▼                      ▼                       ▼
        HtTableBuilderService   HtTableInsightsComponent   HtTableAgentService

TableSettings ──provided to──> HtQuickAngularTableService
                                           │
                             ┌─────────────┴───────────────┐
                             ▼                             ▼
                  HtQuickAngularTableComponent    (data source shared to)
                                                           │
                                             ┌─────────────┴──────────┐
                                             ▼                        ▼
                                  HtTableChartComponent    HtTableAgentService
                                  HtTableInsightsComponent

ChartConfig ──input──> HtTableChartComponent
InsightsConfig ──input──> HtTableInsightsComponent
AgentConfig<T> ──configured on──> HtTableAgentService
```
