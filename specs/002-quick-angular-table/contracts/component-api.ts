/**
 * Component & Service API Contracts — ht-quick-angular-table v2
 *
 * This file defines the TypeScript interface contracts that the implementation
 * MUST satisfy. It is a specification artifact — not production code.
 *
 * Sections:
 *   1. AI Provider System
 *   2. Chart Component
 *   3. Insights Component
 *   4. AI Configuration Builder Service
 *   5. Agent Service
 *   6. Existing Service (fixes only)
 *   7. Provider functions
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. AI PROVIDER SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

export interface AiModelAdapter {
  generate(prompt: string): Promise<string>;
}

export type AiProviderConfig =
  | { provider: 'gemini'; apiKey: string }
  | { provider: 'claude'; apiKey: string }
  | { provider: 'custom'; adapter: AiModelAdapter };

// InjectionToken — declared here for documentation; actual token lives in ai-provider.token.ts
// export const HT_AI_PROVIDER = new InjectionToken<AiProviderConfig>('HT_AI_PROVIDER');


// ─────────────────────────────────────────────────────────────────────────────
// 2. CHART COMPONENT  —  <ht-table-chart>
// ─────────────────────────────────────────────────────────────────────────────

export type ChartType = 'bar' | 'line' | 'pie';

export interface ChartConfig {
  type: ChartType;
  /** Column key used for x-axis labels (bar/line) or slice labels (pie) */
  xColumn: string;
  /** Column key(s) whose numeric values form the dataset(s) */
  yColumns: string[];
  label?: string;
}

/**
 * HtTableChartComponent
 *
 * selector: 'ht-table-chart'
 * standalone: true
 * changeDetection: OnPush
 *
 * Inputs (Angular signal inputs):
 *   config  = input.required<ChartConfig>()
 *   data    = input.required<unknown[]>()   // same array passed to the table
 *
 * Outputs: none
 *
 * Behaviour:
 * - Renders a Chart.js chart (via ng2-charts BaseChartDirective) from `data` and `config`
 * - Re-renders automatically whenever `data` or `config` input changes
 * - Displays an error placeholder when xColumn/yColumn keys are not found in data rows
 * - Displays an empty-state placeholder when data array is empty
 */
export interface IHtTableChartComponent {
  // inputs (signal inputs — not annotated here, see implementation)
  config: ChartConfig;
  data: unknown[];
}


// ─────────────────────────────────────────────────────────────────────────────
// 3. INSIGHTS COMPONENT  —  <ht-table-insights>
// ─────────────────────────────────────────────────────────────────────────────

export interface InsightsConfig {
  /** Column keys for which to compute and display summary statistics */
  statisticColumns?: string[];
  /** Whether to display an AI-generated natural-language summary */
  enableAiSummary?: boolean;
}

export interface ColumnStatistics {
  column: string;
  count: number;
  sum?: number;    // undefined for non-numeric columns
  avg?: number;
  min?: number;
  max?: number;
}

/**
 * HtTableInsightsComponent
 *
 * selector: 'ht-table-insights'
 * standalone: true
 * changeDetection: OnPush
 *
 * Inputs:
 *   config  = input.required<InsightsConfig>()
 *   data    = input.required<unknown[]>()
 *
 * Outputs: none
 *
 * Behaviour:
 * - Computes ColumnStatistics for each key listed in config.statisticColumns
 * - When enableAiSummary is true: injects HT_AI_PROVIDER, calls generate() with a
 *   structured data summary prompt, and displays the returned text
 * - Updates statistics synchronously on every data change (computed())
 * - Updates AI summary asynchronously on data change (debounced 300 ms to avoid
 *   excessive API calls during rapid data updates)
 * - Displays "No data available." when data array is empty
 * - Displays an error message if HT_AI_PROVIDER is not registered and enableAiSummary is true
 */
export interface IHtTableInsightsComponent {
  config: InsightsConfig;
  data: unknown[];
}


// ─────────────────────────────────────────────────────────────────────────────
// 4. AI CONFIGURATION BUILDER SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export interface BuilderMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface BuilderResult {
  /** A valid TableSettings instance ready to pass to HtQuickAngularTableService */
  tableSettings: unknown; // typed as TableSettings in implementation
  /** Any clarifying question the agent is asking before finalising */
  clarification?: string;
}

/**
 * HtTableBuilderService
 *
 * Injectable — provided via provideHtAi() or standalone inject()
 *
 * Methods:
 */
export interface IHtTableBuilderService {
  /**
   * Describe a table in natural language and receive a ready-to-use TableSettings instance.
   * The service maintains a BuilderSession internally — call reset() to start fresh.
   *
   * Returns BuilderResult.tableSettings when configuration is complete.
   * Returns BuilderResult.clarification when the agent needs more information
   * (call describe() again with the user's answer to proceed).
   *
   * Throws if HT_AI_PROVIDER is not registered.
   * Throws if the AI provider returns an unparseable response after 3 retries.
   */
  describe(userMessage: string): Promise<BuilderResult>;

  /**
   * Apply a change to an existing TableSettings instance.
   * Preserves all other configuration; only the described change is applied.
   */
  refine(userMessage: string, current: unknown /* TableSettings */): Promise<BuilderResult>;

  /** Clear the current BuilderSession and start fresh */
  reset(): void;

  /** Read-only snapshot of the current session message history */
  readonly sessionHistory: BuilderMessage[];
}


// ─────────────────────────────────────────────────────────────────────────────
// 5. AGENT SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export interface AgentActionContext<T> {
  row: T | null;
  rows: T[];
  previousResult: unknown | null;
}

export interface AgentAction<T> {
  name: string;
  handler: (context: AgentActionContext<T>) => Promise<unknown>;
}

export interface AgentNextStep {
  condition: (previousResult: unknown) => boolean;
  actionName: string;
}

export type AgentTrigger<T> =
  | { scope: 'row';   condition: (row: T) => boolean;      actionName: string; next?: AgentNextStep }
  | { scope: 'table'; condition: (rows: T[]) => boolean;   actionName: string; next?: AgentNextStep };

export type AgentRunMode = 'on-demand' | 'scheduled' | 'reactive';

export interface AgentConfig<T> {
  actions: AgentAction<T>[];
  triggers: AgentTrigger<T>[];
  runMode: AgentRunMode;
  scheduleIntervalMs?: number;
  timeoutMs?: number; // default: 30_000 ms
}

export interface AgentRunResult {
  triggersEvaluated: number;
  actionsInvoked: number;
  failures: number;
  durationMs: number;
}

export interface AgentActionEvent<T> {
  actionName: string;
  row: T | null;
  result: unknown;
}

export interface AgentFailureEvent<T> {
  actionName: string;
  row: T | null;
  reason: string;
  error?: unknown;
}

/**
 * HtTableAgentService<T>
 *
 * Injectable — instantiated per table context via inject() in host component.
 *
 * Lifecycle:
 *   1. Consumer calls configure(config) to register actions and triggers.
 *   2. Consumer calls connectDataSource(signal) to link the table's data.
 *   3. For 'on-demand' mode: consumer calls run() when desired.
 *   4. For 'scheduled' mode: agent starts automatically after configure(); consumer calls
 *      stop() to cancel the schedule.
 *   5. For 'reactive' mode: agent re-runs after configure() whenever the data signal changes.
 *
 * Outputs (EventEmitter / OutputEmitter):
 *   actionCompleted: AgentActionEvent<T>
 *   actionFailed:    AgentFailureEvent<T>
 *   runCompleted:    AgentRunResult
 *   warning:         string  (emitted when run() is called during an in-progress run)
 */
export interface IHtTableAgentService<T> {
  /**
   * Register actions and triggers.
   * Throws synchronously if:
   *   - actions array is empty
   *   - triggers array is empty
   *   - any trigger's actionName does not match a registered action name
   *   - any action name is duplicated
   *   - runMode is 'scheduled' and scheduleIntervalMs is missing or <= 0
   */
  configure(config: AgentConfig<T>): void;

  /**
   * Connect the agent to the data source.
   * Accepts an Angular Signal<T[]> so reactive mode can respond to signal changes.
   */
  connectDataSource(data: () => T[]): void;

  /**
   * Trigger a single evaluation run.
   * No-op if a run is already in progress (emits 'warning' output instead).
   * Returns a Promise that resolves with AgentRunResult when complete.
   */
  run(): Promise<AgentRunResult>;

  /**
   * Cancel the scheduled runs (for 'scheduled' runMode).
   * No-op for other modes.
   */
  stop(): void;
}


// ─────────────────────────────────────────────────────────────────────────────
// 6. EXISTING SERVICE — FIXES ONLY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * HtQuickAngularTableService — existing service; only the typo fix is specified here.
 *
 * FIX: rename `etTableData(data: any[])` → `setTableData(data: any[])`
 * No other changes to existing public API.
 */
export interface IHtQuickAngularTableService {
  setTableSettings(tableSettings: unknown /* TableSettings */): void;
  setTableData(data: unknown[]): void;  // was: etTableData (typo fixed)
}


// ─────────────────────────────────────────────────────────────────────────────
// 7. PROVIDER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * provideHtAi(config: AiProviderConfig): EnvironmentProviders
 *
 * Registers HT_AI_PROVIDER for the application.
 * Call in app.config.ts providers array.
 *
 * Example:
 *   provideHtAi({ provider: 'gemini', apiKey: environment.geminiKey })
 *   provideHtAi({ provider: 'claude', apiKey: environment.claudeKey })
 *   provideHtAi({ provider: 'custom', adapter: myProxyAdapter })
 */
export interface ProvideHtAiFn {
  (config: AiProviderConfig): unknown; // EnvironmentProviders in implementation
}

/**
 * provideHtQuickAngularTable(): EnvironmentProviders  (existing — unchanged)
 *
 * Registers HtQuickAngularTableService.
 */
export interface ProvideHtQuickAngularTableFn {
  (): unknown; // EnvironmentProviders in implementation
}
