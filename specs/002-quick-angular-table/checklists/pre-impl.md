# Pre-Implementation Checklist: ht-quick-angular-table

**Purpose**: Author self-review — validate requirement completeness, clarity, and consistency across all four subsystems before handing off to implementation. Items marked ⚠️ GATE must be resolved before implementation begins.
**Created**: 2026-02-27
**Resolved**: 2026-02-27
**Feature**: [spec.md](../spec.md) · [plan.md](../plan.md) · [tasks.md](../tasks.md)
**Depth**: Pre-planning author review
**Scope**: All subsystems — US1 (Table), US2 (Charts/Insights), US3 (AI Builder), US4 (Autonomous Agent)

---

## Requirement Completeness — Table Component (US1)

- [x] CHK001 Is the type of "custom renderer reference" accepted by `ColumnDefinition` defined — e.g., `TemplateRef`, component class, or render function — or is the interface left entirely to implementation? [Clarity, Gap, Spec §FR-005]
  - **Resolved**: FR-005 updated — renderers are `TemplateRef<{$implicit: T}>` stamped by the library.
- [x] CHK002 Is the API for toggling column visibility at runtime (FR-009) specified in the requirements — method call on component instance, signal, or property — or only mentioned as a vague "developer-accessible API"? [Clarity, Gap, Spec §FR-009]
  - **Resolved**: FR-009 updated — `toggleColumnVisibility(columnKey: string): void` method via `ViewChild`.
- [x] CHK003 Is the event payload shape for per-row action clicks (FR-008) defined — specifically, what TypeScript type is emitted alongside the action identifier and row data? [Clarity, Gap, Spec §FR-008]
  - **Resolved**: FR-008 updated — event carries `{ actionId: string; row: T }`.
- [x] CHK004 Are the criteria that classify a column as "filterable" versus non-filterable explicitly defined in FR-003 or `ColumnDefinition`, or is filtering implicitly applied to all columns? [Clarity, Gap, Spec §FR-003]
  - **Resolved**: FR-003 and ColumnDefinition entity updated — `filterable: boolean` flag, default `true`.
- [x] CHK005 Are requirements defined for horizontal scroll behavior when columns exceed viewport width (Edge Cases) — are there constraints on CSS overflow, or is this left to implementation? [Completeness, Gap, Spec §Edge Cases]
  - **Resolved**: FR-030 added — component MUST support horizontal scrolling without breaking controls.

---

## Requirement Completeness — Data Visualization (US2)

- [x] CHK006 Are requirements defined for what happens when `statisticColumns` (FR-012) references a non-numeric column — is an error shown, is the column silently skipped, or is a default of zero used? [Coverage, Gap, Spec §FR-012]
  - **Resolved**: FR-012 updated — non-numeric columns are silently excluded; no error raised.
- [x] CHK007 Are requirements defined for the insights panel state when `enableAiSummary: true` but `HT_AI_PROVIDER` is not registered — is a fallback message required, or does the spec leave this undefined? [Coverage, Gap, Spec §FR-013]
  - **Resolved**: FR-013 updated — panel MUST display "AI provider not configured" message.
- [x] CHK008 Is the insights panel's update latency (FR-014) quantified — does SC-002's 500 ms target apply only to the chart or to the insights statistics update as well? [Clarity, Ambiguity, Spec §FR-014 vs §SC-002]
  - **Resolved**: FR-014 and SC-002 updated — 500 ms applies to stats recomputation; AI narrative excluded.
- [x] CHK009 Is the empty-state placeholder behavior for charts (Edge Cases) reflected in a functional requirement — FR-010 has no explicit empty-state clause, only the edge case notes do? [Consistency, Gap, Spec §FR-010 vs §Edge Cases]
  - **Resolved**: FR-010 updated — chart MUST display empty-state placeholder when data source is empty.

---

## ⚠️ GATE: AI Provider & Builder Requirements (US3)

- [x] CHK010 ⚠️ GATE — Are requirements defined for API key security — specifically, is there a requirement that the library must not log, cache, or persist the consumer-supplied API key across calls? [Completeness, Gap, Spec §FR-027/FR-028]
  - **Resolved**: New Assumption added — library MUST NOT log, cache, serialize, or persist API keys.
- [x] CHK011 ⚠️ GATE — Is the `dangerouslyAllowBrowser: true` implication for the built-in Claude provider addressed in the spec as a documented risk and opt-in — or is it only noted in the plan's Complexity Tracking? [Completeness, Gap, plan.md §Complexity Tracking]
  - **Resolved**: New "Claude browser flag" Assumption added — explicit opt-in, documented in quickstart.md.
- [x] CHK012 ⚠️ GATE — Is the `AiModelAdapter.generate()` error contract defined — what must a BYOM adapter do on network failure, rate-limit response, or invalid API key? Are these error shapes specified for the library's event system? [Completeness, Gap, Spec §FR-027]
  - **Resolved**: FR-027 updated — adapter MUST reject with `Error`; library surfaces via `actionFailed` or error message.
- [x] CHK013 Is the return shape for builder clarifying questions (FR-016) defined — are clarifications returned as plain strings, structured objects, or part of a discriminated `BuilderResult` union? [Clarity, Gap, Spec §FR-016]
  - **Resolved**: `BuilderResult` entity added — `{ tableSettings }` or `{ clarification: string }` discriminated union.
- [x] CHK014 Is the `refine()` API (FR-017) specified in the requirements — its signature, what "current configuration in context" means, and the guarantee that "all other configuration is preserved"? [Clarity, Gap, Spec §FR-017]
  - **Resolved**: FR-017 updated with full signature and "copied verbatim" preservation guarantee.
- [x] CHK015 Is FR-029's "configured once and shared" requirement enforced at configuration time or lazily — and is the error thrown when no provider is registered defined in the spec, or only in the plan? [Clarity, Gap, Spec §FR-029 vs plan.md §Phase 3]
  - **Resolved**: FR-029 updated — `Error` thrown at call site, not at bootstrap.
- [x] CHK016 Is the SC-004 "90% success rate across diverse descriptions" acceptance criterion testable — what corpus defines "diverse descriptions" and how is correctness of a rendered table verified? [Measurability, Ambiguity, Spec §SC-004]
  - **Resolved**: SC-004 updated — validated against the five canonical description types in `quickstart.md`.

---

## ⚠️ GATE: Autonomous Agent Requirements (US4)

- [x] CHK017 ⚠️ GATE — Is the `warning` event payload shape defined when a concurrent `run()` is attempted (FR-025) — specifically what fields does the warning event carry so consumers can display or log it? [Clarity, Gap, Spec §FR-025]
  - **Resolved**: FR-025 updated — `warning` carries `{ reason: string }`.
- [x] CHK018 ⚠️ GATE — Is the `actionFailed` reason vocabulary (FR-022) exhaustively defined in requirements — are `'timeout'` and error message strings the only valid reason values, or are additional codes expected? [Clarity, Gap, Spec §FR-022 vs §Edge Cases]
  - **Resolved**: FR-022 updated — `'timeout'` for handler timeout; error `.message` for all other failures.
- [x] CHK019 ⚠️ GATE — Is a minimum valid value for `scheduleIntervalMs` (FR-024) specified — and is there a requirement to validate this at `configure()` time rather than silently accepting 0 or negative values? [Completeness, Gap, Spec §FR-024]
  - **Resolved**: FR-024 updated — must be > 0; `configure()` MUST throw descriptive error otherwise.
- [x] CHK020 Is the `runCompleted` event payload shape (FR-026) defined in the spec — which fields are required (triggers evaluated, actions invoked, failures count, elapsed time)? [Clarity, Gap, Spec §FR-026]
  - **Resolved**: FR-026 and `AgentRunResult` entity added — `{ triggersEvaluated, actionsInvoked, failures, durationMs }`.
- [x] CHK021 Is the `AgentNextStep` multi-step chaining type (FR-023) defined in the spec — what is the follow-up condition's signature, and does chaining apply to table-level triggers as well as row-level? [Completeness, Ambiguity, Spec §FR-023]
  - **Resolved**: FR-023 updated; `AgentNextStep` entity added — applies to both trigger types; recursively chainable.
- [x] CHK022 Is the behavior when a trigger references a non-existent action name specified — is this caught at `configure()` with a descriptive error, or discovered at `run()` time? [Completeness, Gap, Spec §FR-019]
  - **Resolved**: FR-019 updated — `configure()` MUST throw at configuration time.
- [x] CHK023 Is there an acceptance scenario (US4) covering the `reactive` run mode (FR-024) — all six acceptance scenarios cover on-demand and scheduled modes but none cover reactive? [Coverage, Gap, Spec §US4]
  - **Resolved**: US4 acceptance scenario 8 added for reactive run mode.

---

## Requirement Clarity

- [x] CHK024 Is "fully functional, styled data table" (FR-001) qualified — specifically, which Angular Material theme is applied, and is "styled" defined with measurable visual criteria or left to implementation default? [Clarity, Ambiguity, Spec §FR-001]
  - **Resolved**: FR-001 updated — "styled" = Angular Material default theme via library's provider.
- [x] CHK025 Is "no additional template wiring or Material setup required" (FR-001) bounded — does this guarantee extend to theme setup, CDK animations, or Material typography, or only to module/provider registration? [Clarity, Ambiguity, Spec §FR-001]
  - **Resolved**: FR-001 updated — extends to theme, CDK animations, and Material module imports.
- [x] CHK026 Is the start point of the 500 ms chart update window (FR-011) defined — measured from the data array reference change, from a `BehaviorSubject.next()` call, or from a user-triggered action? [Clarity, Ambiguity, Spec §FR-011]
  - **Resolved**: SC-002 updated — window begins when the data array reference changes.
- [x] CHK027 Is "missing required fields" in the invalid configuration edge case differentiated from TypeScript compile-time enforcement — are required fields enforced at the type level, at runtime validation, or both? [Clarity, Ambiguity, Spec §Edge Cases]
  - **Resolved**: Edge case language clarified to say "at initialization time" (runtime); TypeScript provides compile-time enforcement as an additional layer.

---

## Requirement Consistency

- [x] CHK028 Is the chart type set consistent between spec and plan — FR-010 specifies bar/line/pie only, but plan.md Phase 2 and T023 reference "doughnut" as a supported type; if doughnut is in scope, does FR-010 need updating? [Consistency, Conflict, Spec §FR-010 vs plan.md §Phase 2]
  - **Resolved**: FR-010 updated to include doughnut — now consistent with plan.md and T023.
- [x] CHK029 Are the run modes in FR-024 (`on-demand`, `scheduled`, `reactive`) consistently referenced across acceptance scenarios — US4 scenarios 5 and 6 cover on-demand and scheduled, but reactive mode has no corresponding scenario? [Consistency, Gap, Spec §FR-024 vs §US4]
  - **Resolved**: US4 scenario 8 added for reactive mode.
- [x] CHK030 Does the charts empty-state requirement in the edge cases align with the chart functional requirements — FR-010 has no empty-state clause but the edge cases require an "empty-state placeholder"; one of these should be the authoritative source? [Consistency, Gap, Spec §FR-010 vs §Edge Cases]
  - **Resolved**: FR-010 now carries the authoritative empty-state requirement; edge cases remain as elaboration.

---

## ⚠️ GATE: Acceptance Criteria Measurability

- [x] CHK031 ⚠️ GATE — Is SC-005 ("within 2 seconds, excluding external I/O") testable in isolation — how is the agent's own evaluation latency separated from consumer handler latency in a benchmark or test environment? [Measurability, Ambiguity, Spec §SC-005]
  - **Resolved**: SC-005 updated — measured with synchronous mock handlers returning `Promise.resolve({})`.
- [x] CHK032 ⚠️ GATE — Is SC-008 ("< 100 ms interaction latency for 10,000 rows") scoped to specific interaction types — does it cover sort clicks, filter keystrokes, and page navigation, or only one category? Under what device/browser baseline? [Measurability, Ambiguity, Spec §SC-008]
  - **Resolved**: SC-008 updated — covers sort clicks, filter keypresses, page-change clicks; Chrome latest on 4-core/8 GB laptop.
- [x] CHK033 Is SC-001 ("under 5 minutes from install to rendered table") bounded — does the 5-minute window include Angular CLI scaffold and `npm install` time, or only the time spent writing configuration code? [Measurability, Ambiguity, Spec §SC-001]
  - **Resolved**: SC-001 updated — window begins after `npm install` completes; covers only configuration/template code.
- [x] CHK034 Is SC-003 ("under 10 seconds for up to 10 columns") measured consistently — from the moment `describe()` is called, or from when the AI provider receives the prompt (excluding SDK initialization)? [Measurability, Ambiguity, Spec §SC-003]
  - **Resolved**: SC-003 updated — measured from `describe()` call to Promise resolution.

---

## Scenario Coverage & Edge Cases

- [x] CHK035 Are requirements defined for the reactive run mode when a data change fires while a run is already in progress — does FR-025's concurrent-run guard apply to reactively triggered runs, or only explicit `run()` calls? [Coverage, Gap, Spec §FR-024/FR-025]
  - **Resolved**: FR-025 updated — guard applies to all `run()` invocations including reactive-triggered ones.
- [x] CHK036 Are requirements defined for calling `stop()` while a run is in progress — is the in-flight action chain cancelled immediately, or is it allowed to complete before stopping? [Coverage, Gap]
  - **Resolved**: FR-031 added — in-flight chain completes normally; schedule/effect cancelled to prevent new runs.
- [x] CHK037 Is the "table-level trigger with empty dataset" edge case — where the library explicitly does not special-case an empty array — reflected in a functional requirement, or documented only as an edge case note with no normative force? [Coverage, Spec §Edge Cases]
  - **Resolved**: Edge case bullet made normative using MUST language.
- [x] CHK038 Are requirements defined for chart behavior when `yColumns` maps to a column with all null/undefined values — is an error displayed, a zero-value chart rendered, or the column silently omitted? [Coverage, Gap, Spec §FR-010]
  - **Resolved**: New edge case added — chart MUST display descriptive error for all-null y-column series.
- [x] CHK039 Is the `BuilderSession` persistence scope defined — is session history in-memory only (lost on page reload), or is serialization/restoration a requirement? [Coverage, Gap, Spec §Key Entities]
  - **Resolved**: `BuilderSession` entity updated — in-memory only; not serialized or persisted.

---

## Dependencies & Assumptions

- [x] CHK040 Is the Angular Material bundling assumption (Assumptions §last bullet) validated — does bundling Material as a non-peer `allowedNonPeerDependency` create bundle duplication for apps that already have Material installed, and is this trade-off documented? [Assumption, Spec §Assumptions]
  - **Resolved**: New "Angular Material bundling trade-off" Assumption added with tree-shaking note.
- [x] CHK041 Are out-of-scope features (virtual scrolling, tree rows, server-side pagination) addressed with a user-facing response — is there a requirement for the library to return a helpful error or message when a consumer configures an unsupported feature, or does it silently ignore it? [Completeness, Spec §Assumptions]
  - **Resolved**: FR-032 added — MUST throw descriptive error naming unsupported option and closest alternative.

---

## Notes

- All 41 items resolved and closed — spec.md updated 2026-02-27
- ⚠️ GATE items (CHK010–CHK012, CHK017–CHK019, CHK031–CHK032) all resolved in spec.md
- CHK028 (doughnut chart type) resolved: FR-010 now includes doughnut — aligned with plan.md and T023
- `pre-impl.md` is complete; proceed to `/speckit.implement`
