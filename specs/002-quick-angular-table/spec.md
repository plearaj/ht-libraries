# Feature Specification: ht-quick-angular-table — Data Table with AI Insights and Autonomous Actions

**Feature Branch**: `002-quick-angular-table`
**Created**: 2026-02-27
**Status**: Draft
**Input**: Angular Material Table library (ht-quick-angular-table) — a component and service
that renders Angular Material data tables from a configuration class with options (columns,
sorting, pagination, filtering, row actions, etc.). Extended with an AI agent layer that:
(1) generates table configurations from natural language descriptions, (2) takes autonomous
actions on table data (e.g. search for best price and reorder when a supply item is low),
and (3) renders charts and other insights from the data in the table.

## Clarifications

### Session 2026-02-27

- Q: How does a developer express an agent trigger condition — predicate function, declarative rule object, or string expression? → A: Predicate function `(row: T) => boolean` — fully type-safe, no custom parser required, consistent with Angular Material datasource filter predicate pattern.
- Q: How does a consuming app provide AI model credentials/endpoint to the library? → A: Two modes supported — (1) **BYOM**: consumer provides a custom model adapter via an Angular InjectionToken; (2) **Built-in providers**: library ships with pre-configured support for Gemini and Claude; consumer selects the provider and supplies their own API key for that provider.
- Q: Should agent triggers support table-level conditions (evaluated once against the full dataset) in addition to row-level conditions? → A: Both — row-level triggers use `(row: T) => boolean` (evaluated per row), table-level triggers use `(rows: T[]) => boolean` (evaluated once against the full dataset); developer declares which kind each trigger is.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Render a Complex Table from a Configuration Class (Priority: P1)

A developer needs a sortable, filterable, paginated data table with per-row actions in their
Angular app. They construct a configuration object using the library's configuration class,
specifying columns, data, feature toggles, and optional per-row action buttons. They add the
component to their template and a fully functional, styled data table renders — no template
wiring, no manual Material setup required.

**Why this priority**: The table component is the entire foundation of the library. Every
other story depends on data being displayed in a table. Without this, nothing else has value.
This is the independently shippable MVP.

**Independent Test**: Construct a configuration class instance with four columns (text,
number, date, boolean), an array of ten sample rows, sorting enabled on all columns, a global
filter, five-row pagination, and two row-action buttons ("Edit", "Delete"). Add the component
to an Angular template. Confirm: a fully rendered table appears, column headers sort rows on
click, the filter input narrows rows, pagination controls navigate pages, and the action
buttons appear on each row. No agent or chart features need to exist.

**Acceptance Scenarios**:

1. **Given** a developer constructs a valid configuration class instance, **When** they add
   the table component to their template, **Then** a fully rendered, styled table appears with
   all configured columns, sort controls, a filter input, and pagination — no additional code.
2. **Given** the table is rendered, **When** a user clicks a column header, **Then** rows sort
   ascending on first click and descending on second click; an indicator shows the active sort.
3. **Given** the table is rendered, **When** a user types in the filter input, **Then** only
   rows whose data matches the filter text are shown; the page count updates accordingly.
4. **Given** the table is rendered with pagination enabled, **When** a user navigates pages,
   **Then** only the correct page of rows is shown and the page indicator updates.
5. **Given** a configuration includes per-row action buttons, **When** the table renders,
   **Then** each row displays those action buttons and clicking one emits the corresponding
   event with the row's data.
6. **Given** a configuration specifies a custom cell renderer for a column, **Then** that
   column renders the custom content (icon, badge, link) instead of a plain text value.
7. **Given** the data source contains no rows, **Then** the table displays the configured
   empty-state message instead of a blank or broken layout.
8. **Given** an invalid or incomplete configuration is passed, **Then** the component throws
   a descriptive error at initialization time — no silent rendering of a broken table.

---

### User Story 2 - Visualize Table Data as Charts and AI-Generated Insights (Priority: P2)

A developer has a table rendering supply inventory data. They want to give their users a
chart view showing stock levels by category and a plain-language summary of trends — without
building a separate analytics page. They configure the library's chart and insights panel
by specifying which table columns map to which axes, choose a chart type, and add an insights
component alongside the table. Both update automatically when the table data changes.

**Why this priority**: Data visualization and insights transform the table from a display
component into a decision-support tool, which is the primary differentiator over a raw
Material table. This can be demonstrated with static data without any agent actions being
implemented, so it is independently deliverable after the core table.

**Independent Test**: Render a table with inventory data (item name, quantity, category,
last-order date). Add a bar chart configured to show quantity by category and an insights
panel. Confirm: the chart renders with correct bars, updates when the table data changes, and
the insights panel displays a natural-language summary of the data (e.g., "3 items are below
the reorder threshold"). No autonomous agent actions need to exist.

**Acceptance Scenarios**:

1. **Given** a developer configures a chart (type, x-column, y-column) alongside a table,
   **When** the table renders, **Then** the chart renders with the correct data, axis labels,
   and chart type (bar, line, or pie).
2. **Given** the table data changes (rows added, removed, or updated), **When** the change
   occurs, **Then** the chart updates to reflect the new data within 500 milliseconds.
3. **Given** an insights panel is configured alongside the table, **When** the table renders,
   **Then** the panel displays a natural-language summary of the current data (counts, totals,
   notable highs/lows, trend observations).
4. **Given** the insights panel is visible and the table data changes, **When** the change
   occurs, **Then** the insights summary updates to reflect the new state of the data.
5. **Given** summary statistics are enabled in the configuration, **When** the table renders,
   **Then** computed metrics (count, sum, average, min, max) appear for configured numeric
   columns — either inline below the table or in the insights panel.

---

### User Story 3 - Generate a Table Configuration from a Natural Language Description (Priority: P3)

A developer wants to add a table to their app but is unfamiliar with the configuration API.
They open the table builder chat (an injectable service or a companion UI component) and type
"I need a table showing product name, unit price, stock quantity, and supplier — sortable by
price, 20 rows per page, with Edit and Delete actions on each row." The agent responds with a
ready-to-use configuration object. They copy it, pass it to the table component, and the
table renders exactly as described.

**Why this priority**: The AI configuration builder dramatically lowers the barrier to
adopting the library for developers unfamiliar with the configuration API. It is
independently useful — a developer can use it to produce a config and then use the library
with no further AI involvement.

**Independent Test**: Call the configuration builder service with the natural language string
"I need a table with user name, email, role, and registration date — sortable by date, 10
rows per page." Confirm the returned configuration object, when passed directly to the table
component, produces that exact table without any manual edits.

**Acceptance Scenarios**:

1. **Given** a developer describes a table in natural language, **When** the builder service
   processes the description, **Then** it returns a valid, fully-populated configuration
   object within 10 seconds for descriptions of up to 10 columns.
2. **Given** the description is ambiguous (e.g., column types are unclear), **When** the
   builder processes it, **Then** it asks at most 3 targeted clarifying questions before
   producing a configuration — it does not silently assume and produce an incorrect result.
3. **Given** the builder returns a configuration, **When** the developer passes it to the
   table component without modification, **Then** the table renders exactly as described —
   no manual corrections required (90% success rate across diverse descriptions).
4. **Given** a developer wants to modify an existing configuration (e.g., "add a status
   column with badge styling"), **When** they send that request to the builder with the
   current configuration in context, **Then** only the specified change is applied and all
   other configuration is preserved.
5. **Given** a description that cannot produce a valid configuration (e.g., contradictory
   requirements), **When** the builder processes it, **Then** it responds with a clear
   explanation of the conflict rather than returning an invalid configuration.

---

### User Story 4 - Autonomous Agent Actions on Table Data (Priority: P4)

A developer builds a supply inventory table. They want the system to automatically check
stock levels every hour, identify items below a reorder threshold, search an external
supplier API for the best price, and place a reorder when a predefined budget condition is
met — all without the user initiating anything. The developer registers named action handlers
(search-supplier, place-order) and defines trigger conditions (quantity < threshold AND
price <= budget) via the agent configuration. The agent evaluates conditions against the live
table data and invokes the appropriate handlers, emitting events that the host app can
display in a status panel or audit log.

**Why this priority**: Autonomous agent actions are the highest-value, highest-complexity
feature. They require the core table (P1) and ideally stable data to act on. They are
delivered last because the agent depends on consumer-provided action handlers and external
integrations that are out of the library's control. However, the library's orchestration
layer — condition evaluation, handler invocation, event emission — is fully testable with
mock handlers.

**Independent Test**: Register two mock action handlers ("fetch-price" returns a fixed price
object, "place-order" resolves immediately). Define one trigger: when `quantity < 10` call
"fetch-price", then if `price <= 50` call "place-order". Load a table with two rows: one
with quantity 5 (below threshold), one with quantity 20. Run the agent. Confirm: "fetch-price"
is called once (for the low-stock row), "place-order" is called once (price ≤ 50), and the
corresponding `actionCompleted` events are emitted with the correct row and result data.
The mock handlers require no external network calls.

**Acceptance Scenarios**:

1. **Given** a developer registers named action handlers and defines row-level trigger
   conditions, **When** the agent runs, **Then** it evaluates each row-level predicate
   against every row and invokes the matching handler once per row where the predicate
   returns `true`.
1a. **Given** a developer defines a table-level trigger condition (e.g., total inventory
   value below a threshold), **When** the agent runs, **Then** it evaluates the table-level
   predicate once against the full dataset and invokes the handler once if it returns `true`.
2. **Given** an action handler is invoked, **When** the handler resolves, **Then** the agent
   emits an `actionCompleted` event with the triggering row data, the action name, and the
   handler's result.
3. **Given** an action handler throws or rejects, **When** the failure occurs, **Then** the
   agent emits an `actionFailed` event with the error and does not crash; it continues
   evaluating remaining triggers and rows.
4. **Given** a multi-step condition (e.g., "search price THEN place order only if price ≤ N"),
   **When** the first action handler's result is available, **Then** the agent uses that
   result to evaluate the next condition before invoking the next handler.
5. **Given** the developer configures the agent to run on-demand, **When** they call
   `agent.run()`, **Then** the agent evaluates all triggers against the current data exactly
   once and completes; it does not re-run automatically.
6. **Given** the developer configures a run schedule (e.g., every 60 minutes), **When**
   each interval elapses, **Then** the agent evaluates all triggers against the current
   data and emits results; the schedule can be cancelled by the developer.
7. **Given** no rows satisfy any trigger condition, **When** the agent runs, **Then** no
   handlers are invoked and the agent emits a `runCompleted` event with a summary of
   zero actions taken.
8. **Given** the developer configures reactive run mode and connects a data-source signal,
   **When** the data-source signal emits a new value, **Then** the agent evaluates all
   triggers against the updated data and emits `runCompleted`; if a run is already in
   progress at the moment of emission, the reactive trigger MUST be treated as a concurrent
   call and MUST emit `warning` per FR-025.

---

### Edge Cases

- **Invalid configuration**: A configuration class instance with missing required fields
  (no columns, no data source) MUST produce a descriptive error at initialization time —
  never a blank table or a runtime exception with an unclear stack trace.
- **Empty data source**: When the data source contains zero rows, the table MUST display
  the configured empty-state message; charts MUST display an empty-state placeholder rather
  than a broken visualization; the insights panel MUST indicate "No data available."
- **Agent action timeout**: If a consumer-provided action handler does not resolve within
  the configured timeout (default: 30 seconds), the agent MUST emit `actionFailed` with a
  timeout reason and proceed with remaining triggers.
- **Table-level trigger with empty dataset**: If a table-level trigger fires on an empty
  data source, the predicate MUST receive an empty array; the handler MUST be invoked if and
  only if the predicate returns `true` for that empty array — the library MUST NOT
  special-case or skip evaluation for an empty dataset.
- **Concurrent agent runs**: If `agent.run()` is called while a run is already in progress,
  the second call MUST be a no-op; the agent MUST emit a warning event rather than
  starting a parallel run.
- **Natural language describing an unsupported feature**: If the configuration builder
  receives a request for a feature not supported by the configuration schema (e.g., tree
  rows), it MUST respond by listing supported features and offering the closest alternative.
- **Chart with incompatible column types**: If a chart is configured with a column whose
  data type cannot be used on the specified axis (e.g., an object column on a numeric y-axis),
  the chart MUST display a descriptive error message in place of the visualization.
- **Chart with all-null y-column values**: If every row's value for a `yColumns` entry is
  `null` or `undefined`, the chart MUST display a descriptive error message in place of that
  data series rather than rendering a zero-value or broken series.
- **More columns than the viewport can display**: The table MUST scroll horizontally without
  breaking sort, filter, or pagination controls.
- **Extremely large data sets**: The library MUST remain responsive when the data source
  contains up to 10,000 rows; developers needing more are directed to server-side pagination.

## Requirements *(mandatory)*

### Functional Requirements

**Table Component**

- **FR-001**: The component MUST render a fully functional, styled data table given a valid
  configuration class instance, with no additional template wiring or Material setup by the consumer.
  "Styled" means the Angular Material default theme is applied via the library's provider; consuming
  apps require no additional theme setup, CDK animations configuration, or Material module imports.
- **FR-002**: The component MUST support per-column sort toggled on or off; clicking a column
  header cycles through ascending → descending → unsorted states.
- **FR-003**: The component MUST support a global filter input that narrows displayed rows to
  those matching the filter text across all filterable columns. A column is filterable when its
  `ColumnDefinition.filterable` flag is `true`; columns with `filterable: false` are excluded
  from the global filter predicate.
- **FR-004**: The component MUST support pagination with configurable page sizes defined in
  the configuration class.
- **FR-005**: The component MUST support per-column custom cell renderers so that developers
  can display non-text content (icons, badges, links, buttons) without modifying the library.
  Custom renderers are supplied as `TemplateRef<{$implicit: T}>` values defined in the consumer's
  host component template; the library stamps the template into the cell and passes the row as
  `$implicit`.
- **FR-006**: The component MUST display a configurable empty-state message when the data
  source contains no rows.
- **FR-007**: The component MUST accept a typed data source so TypeScript consumers receive
  compile-time type checking on column keys and cell data.
- **FR-008**: The component MUST support configurable per-row action buttons or menu items
  defined in the configuration class; clicking an action MUST emit an event containing the
  action identifier and the row's data. The emitted event carries `{ actionId: string; row: T }`.
- **FR-009**: The component MUST support toggling column visibility at runtime. The component
  exposes a `toggleColumnVisibility(columnKey: string): void` method on the component instance
  (accessed via `ViewChild`); calling it with a hidden column's key shows it, and calling it
  with a visible column's key hides it.

**Data Visualization**

- **FR-010**: The library MUST provide a chart component that renders bar, line, pie, and
  doughnut charts from table data; the developer specifies chart type and which columns map to
  each axis. When the data source is empty, the chart MUST display a configurable empty-state
  placeholder message in place of the visualization.
- **FR-011**: The chart component MUST update automatically when the table's data source
  changes, with the updated visualization appearing within 500 milliseconds.
- **FR-012**: The library MUST provide an insights component that displays auto-computed
  summary statistics (count, sum, average, min, max) for configured numeric columns. Columns
  whose values are not numeric are silently excluded from statistics; no error is raised.
- **FR-013**: The insights component MUST display a natural-language summary of the current
  data state, generated by the AI layer, covering notable counts, trends, and threshold
  observations. When `enableAiSummary: true` and no `HT_AI_PROVIDER` is registered, the panel
  MUST display a descriptive error message ("AI provider not configured") instead of crashing.
- **FR-014**: The insights component MUST update its summary when the table data changes. The
  500 ms target in SC-002 applies to statistical recomputation; AI narrative generation is
  asynchronous and has no hard latency guarantee — the panel shows a loading indicator until
  the response arrives.

**AI Provider Configuration**

- **FR-027**: The library MUST support a **BYOM (Bring Your Own Model)** mode in which a
  consuming app registers a custom model adapter via an Angular InjectionToken; the adapter
  implements a standard interface (accept a prompt string, return a response string) so any
  model or endpoint can be used without modifying the library. A BYOM adapter MUST reject the
  returned `Promise` with an `Error` instance on failure; the library catches this rejection
  and surfaces it as an `actionFailed` event (agent) or a displayed error message (insights,
  builder) — adapters MUST NOT swallow errors silently.
- **FR-028**: The library MUST ship with **built-in provider support** for Gemini and Claude;
  a consuming app selects the provider and supplies its own API key via the same Angular
  InjectionToken; no additional adapter code is required.
- **FR-029**: All library AI features (configuration builder, insights summaries, autonomous
  agent reasoning) MUST use the single registered provider — the provider is configured once
  and shared across all AI-dependent components in the same application. When an AI-dependent
  feature is used and no `HT_AI_PROVIDER` is registered, the library MUST throw a descriptive
  `Error` at the call site — not during injection or application bootstrap.

- **FR-030**: The table component MUST support horizontal scrolling when the number of rendered
  columns exceeds the container width; horizontal scrolling MUST NOT break sort, filter, or
  pagination controls.

- **FR-031**: Calling `stop()` while a run is in progress cancels the schedule or reactive
  effect, preventing new runs from starting; the in-flight action chain MUST be allowed to
  complete normally before the agent becomes idle.

- **FR-032**: If a configuration requests a feature explicitly out of scope for this version
  (e.g., tree rows, server-side pagination), the component MUST throw a descriptive error at
  initialization time that names the unsupported option and offers the closest supported
  alternative.

**AI Configuration Builder**

- **FR-015**: The library MUST provide a service that accepts a natural-language string
  describing a table and returns a valid configuration class instance compatible with the
  table component.
- **FR-016**: The configuration builder service MUST ask at most 3 targeted clarifying
  questions when the description is ambiguous rather than making silent assumptions.
- **FR-017**: The configuration builder MUST support iterative refinement: a developer can
  send a follow-up request alongside the existing configuration to apply a specific change,
  with all other configuration preserved. The refinement API is
  `refine(userMessage: string, current: TableSettings): Promise<BuilderResult>`; "all other
  configuration preserved" means every field not mentioned in `userMessage` is copied verbatim
  from `current` into the returned `TableSettings`.
- **FR-018**: Every configuration class instance produced by the builder MUST pass the table
  component's validation — no manual corrections required.

**Autonomous Agent**

- **FR-019**: The library MUST provide an agent service that accepts named action handlers
  and trigger conditions of two kinds: **row-level** (`(row: T) => boolean`, evaluated
  independently against each row) and **table-level** (`(rows: T[]) => boolean`, evaluated
  once against the full dataset); the developer declares the trigger kind in `AgentConfig`.
  If a trigger's `actionName` does not match any registered action handler, `configure()` MUST
  throw a descriptive error at configuration time — no silent failure at run time.
- **FR-020**: When the agent runs, it MUST evaluate row-level triggers against each row in
  the current data source and invoke the matching handler for every row where the predicate
  returns `true`; it MUST evaluate table-level triggers once against the full dataset and
  invoke the matching handler when the predicate returns `true`.
- **FR-021**: For each completed handler invocation, the agent MUST emit an `actionCompleted`
  event carrying the action name, the triggering row data, and the handler's return value.
- **FR-022**: For each failed handler invocation (error or timeout), the agent MUST emit an
  `actionFailed` event with the action name, row data, and reason; it MUST continue
  processing remaining triggers without crashing. `actionFailed` carries `reason: 'timeout'`
  when the handler exceeds `timeoutMs`; for all other failures `reason` is the error's
  `.message` string.
- **FR-023**: The agent MUST support sequential multi-step conditions where a subsequent
  action is triggered only when the preceding action's result satisfies a follow-up condition.
  Multi-step chaining applies to both row-level and table-level triggers. The next step is
  expressed as `AgentNextStep { condition: (result: unknown) => boolean; actionName: string }`;
  the next handler is invoked only when `condition(previousResult)` returns `true`. Steps can
  be chained recursively via `AgentNextStep.next`.
- **FR-024**: The agent MUST support three run modes: on-demand (single `run()` call),
  scheduled (interval defined in configuration), and reactive (re-runs when the data source
  changes). For scheduled mode, `scheduleIntervalMs` MUST be a positive integer greater than
  zero; `configure()` MUST throw a descriptive error if the value is zero or negative.
- **FR-025**: When a second `run()` is invoked while a run is in progress — whether called
  explicitly or triggered by the reactive run mode — the agent MUST ignore the call and emit
  a `warning` event carrying `{ reason: string }` (e.g.,
  `{ reason: 'Agent run already in progress' }`). It MUST NOT execute concurrent runs.
- **FR-026**: The agent MUST emit a `runCompleted` event at the end of each run, summarising
  the number of triggers evaluated, actions invoked, and any failures. The event carries
  `AgentRunResult { triggersEvaluated: number; actionsInvoked: number; failures: number;
  durationMs: number }`.

### Key Entities

- **TableConfig**: The configuration class instance that drives the table component; carries
  column definitions, data source, feature flags (sort, filter, pagination, column visibility),
  empty-state message, and row action definitions.
- **ColumnDefinition**: A single column's specification within `TableConfig`; carries the
  column key, display label, data type, sort enabled flag, `filterable: boolean` (default
  `true`) to control global-filter inclusion, optional `renderer?: TemplateRef<{$implicit: T}>`
  for custom cell content, and axis eligibility for charts.
- **RowAction**: A per-row action button or menu item defined within `TableConfig`; carries
  an identifier, display label, optional icon, and optional visibility condition.
- **ChartConfig**: Configuration for a single chart; specifies chart type (bar, line, pie),
  the table column used for the x-axis, and one or more columns used for the y-axis.
- **InsightsConfig**: Configuration for the insights panel; specifies which columns include
  summary statistics and whether AI-generated summaries are enabled.
- **AgentConfig**: Configuration for the autonomous agent; carries named action handlers,
  trigger conditions, run mode, and optional schedule interval and timeout settings.
- **AgentAction**: A named, consumer-provided handler function registered with the agent;
  receives the triggering row's data and any preceding action results; returns a result
  value used in subsequent condition evaluation.
- **AgentTrigger**: A condition-action pair with a declared scope. **Row-level triggers**
  carry a predicate `(row: T) => boolean` evaluated independently against each row — the
  handler is invoked once per matching row. **Table-level triggers** carry a predicate
  `(rows: T[]) => boolean` evaluated once against the full dataset — the handler is invoked
  once when the predicate returns `true`. Both types share the same action invocation, event
  emission, and error-handling behaviour, and both support an optional `next?: AgentNextStep`
  field for multi-step chaining.
- **AgentNextStep**: A follow-up condition-action pair within a trigger chain. Carries
  `condition: (result: unknown) => boolean` (evaluated against the preceding handler's return
  value) and `actionName: string` (the handler to invoke when the condition is `true`). Can
  be chained recursively via its own optional `next?: AgentNextStep` field.
- **BuilderSession**: A stateful conversation between the developer and the configuration
  builder service; accumulates message history so iterative refinements are understood in
  context. Session history is in-memory only and is not serialized or persisted across page
  reloads.
- **BuilderResult**: The discriminated union returned by `HtTableBuilderService`. Either
  `{ tableSettings: TableSettings }` when the description produces a valid configuration, or
  `{ clarification: string }` when the builder needs more information or cannot parse the AI
  response.
- **AgentRunResult**: The payload of the `runCompleted` event. Carries
  `triggersEvaluated: number`, `actionsInvoked: number`, `failures: number`, and
  `durationMs: number`.
- **AiProviderConfig**: The configuration object registered via Angular InjectionToken that
  defines the active AI provider; either selects a built-in provider (`'gemini'` or
  `'claude'`) with its API key, or supplies a BYOM adapter implementing the standard model
  interface (prompt-in / response-out).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can go from installing the library to a rendered, interactive,
  styled data table in under 5 minutes using the configuration class approach alone. The
  5-minute window begins after `npm install` completes and covers only the time spent writing
  configuration and template code.
- **SC-002**: Charts and insights update within 500 milliseconds of a data source change.
  The 500 ms window applies to chart rendering and insights statistical recomputation; it
  begins when the data array reference changes and ends when the updated visualization is
  painted. AI narrative generation in the insights panel is excluded (see FR-014).
- **SC-003**: The configuration builder returns a valid, copy-paste-ready configuration
  object from a plain-language description in under 10 seconds for up to 10-column tables.
  The 10-second window is measured from when `describe()` is called to when the returned
  Promise resolves.
- **SC-004**: 90% of first-attempt builder-generated configurations render correctly in the
  table component without manual edits. Correctness is validated against the five canonical
  description types documented in `quickstart.md` (text-only tables, numeric tables,
  date-sorted tables, multi-action tables, filtered tables).
- **SC-005**: The autonomous agent evaluates all trigger conditions and invokes matching
  handlers within 2 seconds of a run being initiated (excluding external I/O time in
  consumer-provided handlers). Measured in a test environment using synchronous mock handlers;
  "external I/O time" is excluded by replacing all action handlers with
  `() => Promise.resolve({})`.
- **SC-006**: Invalid or incomplete configuration inputs (missing fields, type mismatches)
  always produce a descriptive error message — zero silent failures or blank renders.
- **SC-007**: The library builds and tests independently with zero errors; consuming apps
  require no additional installs beyond `ht-quick-angular-table`.
- **SC-008**: The table component remains responsive (< 100 ms interaction latency) for
  data sources of up to 10,000 rows using client-side pagination. "Interaction latency"
  covers sort-header clicks, filter keypress events, and page-change button clicks, measured
  in Chrome latest on a commodity laptop (4-core CPU, 8 GB RAM).

## Assumptions

- AI features (configuration builder, insights summaries, autonomous agent reasoning)
  require the consuming app to register an `AiProviderConfig` via Angular InjectionToken.
  Two modes are supported: (1) **Built-in providers** — consumer selects `'gemini'` or
  `'claude'` and supplies their own API key for that provider; (2) **BYOM** — consumer
  supplies a custom adapter implementing the standard model interface. Additional built-in
  providers beyond Gemini and Claude are out of scope for this version.
- Autonomous agent action handlers are consumer-provided functions; the library orchestrates
  when to call them but does not supply pre-built integrations with external services.
- The library targets Angular 21 and Angular Material 21+; older versions are out of scope.
- **API key security**: The library MUST NOT log, cache, serialize, or persist
  consumer-supplied API keys; keys are passed directly to the relevant SDK on each call and
  are never stored beyond the lifetime of the call.
- **Claude browser flag**: The built-in Claude provider sets `dangerouslyAllowBrowser: true`
  in the Anthropic SDK constructor. This is an explicit, documented opt-in required for
  browser environments; it is not a security vulnerability. Consuming apps using the built-in
  Claude provider accept this trade-off. The implication is documented in `quickstart.md`.
- **Angular Material bundling trade-off**: Bundling `@angular/material` as a non-peer
  dependency means apps that already have Material installed may receive two copies during
  development, but tree-shaking ensures a single copy in production builds. This is a
  deliberate trade-off to minimise consumer setup friction.
- Virtual scrolling, tree-table rows, and nested expandable rows are out of scope for this
  version.
- Server-side pagination (where the data source is a paginated API) is out of scope; the
  library performs client-side pagination over an in-memory data array.
- The GUI/TUI configuration builder (point-and-click interface) present in the earlier
  `001-quick-angular-table` draft is explicitly out of scope for this version; the chat-based
  builder service covers the same use case for the target developer audience.
- The library bundles Angular Material so consuming apps do not need a separate
  `@angular/material` installation.
