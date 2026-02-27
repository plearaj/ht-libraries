# Feature Specification: ht-quick-angular-table + Table Builder Agent

**Feature Branch**: `001-quick-angular-table`
**Created**: 2026-02-18
**Status**: Draft
**Input**: Angular Material table component that allows developers to quickly set up
complex tables; extended with an agent that builds table configurations via chat or an
intuitive GUI/TUI

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Render a Complex Table from a Configuration Object (Priority: P1)

A developer needs a sortable, filterable, paginated data table in their Angular app.
They pass a configuration object to the ht-quick-angular-table component specifying
columns, data source, and behaviours, and a fully functional Angular Material table is
rendered — with no manual template wiring required.

**Why this priority**: The core table component is the entire foundation of the library.
Without it, the agent and GUI features have nothing to produce output for. This is the
MVP that must work independently of all other stories.

**Independent Test**: Pass a configuration object with three columns and an array of
sample rows to the component; a rendered table appears with sort arrows on each column,
a working filter input, and pagination controls. No agent or GUI needs to exist.

**Acceptance Scenarios**:

1. **Given** a developer provides a valid configuration object, **When** they add the
   table component to their template, **Then** a fully rendered table appears with all
   configured columns, sort controls, a filter input, and pagination without additional
   code.
2. **Given** the table is rendered, **When** a user clicks a column header, **Then** the
   rows sort ascending/descending by that column's value.
3. **Given** the table is rendered, **When** a user types in the filter input, **Then**
   only rows matching the filter text are displayed.
4. **Given** the table is rendered with pagination enabled, **When** a user navigates
   pages, **Then** only the correct page of rows is shown and the page indicator updates.
5. **Given** a developer provides a configuration with a custom cell renderer for a
   column, **Then** that column renders the custom content instead of a plain text value.

---

### User Story 2 - Build a Table Configuration via Chat (Priority: P2)

A developer describes their desired table in natural language using a chat interface
embedded in or alongside the library tooling. The agent interprets the description,
asks clarifying questions if needed, and produces a ready-to-use configuration object
that the developer can copy into their project.

**Why this priority**: The agent is the key differentiator of this library over raw
Angular Material. Enabling non-expert developers to describe tables in plain language
and receive working configurations dramatically lowers the barrier to adoption.

**Independent Test**: A developer types "I need a table showing user names, emails, and
signup dates, sortable by date, with 10 rows per page"; the agent returns a valid
configuration object that, when passed to the table component, produces the described
table. Chat interface operable independently of the GUI.

**Acceptance Scenarios**:

1. **Given** a developer opens the table builder chat, **When** they describe a table in
   plain language, **Then** the agent returns a complete, valid configuration object
   within 10 seconds.
2. **Given** the developer's description is ambiguous (e.g., no column types specified),
   **When** the agent processes it, **Then** the agent asks at most 3 targeted
   clarifying questions before producing the configuration.
3. **Given** the agent produces a configuration, **When** the developer copies it into
   their Angular app and passes it to the table component, **Then** the table renders
   exactly as described — no manual edits required.
4. **Given** a developer asks the agent to modify an existing configuration (e.g., "add
   a status column"), **When** the agent processes the request, **Then** only the
   specified change is applied and all other configuration is preserved.

---

### User Story 3 - Build a Table Configuration via Visual GUI/TUI (Priority: P3)

A developer prefers a point-and-click or keyboard-driven interface over chat. They open
the table builder GUI or TUI, add columns by name and type, toggle features like
sorting and pagination, preview the table live, and export the resulting configuration
object to their clipboard or a file.

**Why this priority**: The GUI/TUI caters to developers who prefer direct manipulation
over natural language. It provides a complementary path to the same output, ensuring
the builder is accessible regardless of working style.

**Independent Test**: A developer opens the GUI, adds two columns with names and types,
enables pagination, and clicks export; a valid configuration object is copied to the
clipboard. Testable independently of the chat interface.

**Acceptance Scenarios**:

1. **Given** a developer opens the table builder GUI/TUI, **When** they add a column
   with a name and select its type, **Then** the column appears in a live preview of
   the table immediately.
2. **Given** one or more columns are defined, **When** the developer toggles sorting,
   filtering, or pagination on/off, **Then** the live preview updates to reflect the
   change in real time.
3. **Given** a developer is satisfied with the configuration, **When** they click export
   or press the export key, **Then** the configuration object is copied to the clipboard
   and/or written to a file they specify.
4. **Given** a developer has an existing configuration, **When** they load it into the
   GUI/TUI, **Then** the current state of the builder reflects that configuration for
   further editing.

---

### User Story 4 - Use the Table in an App Without Installing Angular Material (Priority: P4)

A consuming app should not need to install Angular Material separately. The library
bundles Angular Material (or exposes it as a peer dependency that the developer need
not configure manually) so the table renders correctly out of the box.

**Why this priority**: Dependency management friction is a common barrier to adopting
component libraries. Minimising it improves adoption.

**Independent Test**: An Angular app with only `ht-quick-angular-table` in its
dependencies renders a table with full Material styling. Testable independently of the
agent features.

**Acceptance Scenarios**:

1. **Given** an Angular app lists only `ht-quick-angular-table` as a dependency,
   **When** the app is built and a table component is rendered, **Then** Angular Material
   table styles and controls appear correctly without installing `@angular/material`
   separately.

---

### Edge Cases

- What happens when the configuration object is missing required fields? The component
  must throw a descriptive error at initialization time, not render a broken table.
- What happens when the data source is an empty array? The table must display an empty
  state message rather than a blank or broken layout.
- What happens when the agent receives a completely nonsensical description? The agent
  must respond with a clarifying prompt rather than producing an invalid configuration.
- What happens when a developer loads an invalid configuration into the GUI/TUI? The
  interface must highlight the invalid fields and prevent export until they are corrected.
- What happens when the number of columns exceeds what fits in the viewport? The table
  must scroll horizontally without breaking the sort or filter controls.

## Requirements *(mandatory)*

### Functional Requirements

**Table Component**

- **FR-001**: The component MUST render a fully functional Angular Material table given
  a valid configuration object, with no additional template wiring by the consumer.
- **FR-002**: The component MUST support column-level sorting toggled on or off per
  column via configuration.
- **FR-003**: The component MUST support a global filter input that narrows displayed
  rows to those matching the filter text.
- **FR-004**: The component MUST support pagination with configurable page sizes via
  the configuration object.
- **FR-005**: The component MUST support custom cell renderers per column so that
  developers can display non-text content (icons, links, chips) without modifying the
  library.
- **FR-006**: The component MUST display a configurable empty-state message when the
  data source contains no rows.
- **FR-007**: The component MUST accept a typed data source so that TypeScript consumers
  receive type checking on column definitions and cell data.

**Table Builder Agent (Chat)**

- **FR-008**: The agent MUST accept a natural language description of a table and return
  a valid configuration object compatible with the table component.
- **FR-009**: The agent MUST ask targeted clarifying questions (at most 3) when the
  description is ambiguous, rather than making silent assumptions.
- **FR-010**: The agent MUST support iterative refinement: a developer can describe a
  change to an existing configuration and receive the updated configuration without
  starting over.
- **FR-011**: The agent MUST produce configuration objects that pass validation by the
  table component — no manual correction should be required.

**Table Builder GUI/TUI**

- **FR-012**: The GUI/TUI MUST allow a developer to define columns by name, data type,
  and display options through direct interaction (clicks or keyboard).
- **FR-013**: The GUI/TUI MUST provide a live preview of the table that updates in real
  time as the developer modifies the configuration.
- **FR-014**: The GUI/TUI MUST allow toggling of table-level features (sorting,
  filtering, pagination) and show the effect in the live preview immediately.
- **FR-015**: The GUI/TUI MUST export the configuration object to the clipboard and
  optionally to a file chosen by the developer.
- **FR-016**: The GUI/TUI MUST accept an existing configuration object as input for
  further editing.

### Key Entities

- **Table Configuration**: The input object passed to the table component; defines
  columns, data source, feature toggles (sort, filter, pagination), and per-column
  renderers.
- **Column Definition**: A single column's spec within the configuration; carries the
  column key, display label, data type, sort/filter enablement, and optional custom renderer.
- **Agent Session**: A stateful chat exchange between the developer and the builder
  agent; accumulates context across turns so that follow-up refinements are understood
  in context.
- **Builder State** (GUI/TUI): The in-memory representation of the table being designed;
  maps one-to-one to a Table Configuration and drives the live preview.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can go from installing the library to a rendered, interactive
  table in under 5 minutes using the configuration approach alone.
- **SC-002**: The agent produces a valid, copy-paste-ready configuration object from a
  plain-language description in under 10 seconds for descriptions of up to 10 columns.
- **SC-003**: The GUI/TUI live preview updates within 300 milliseconds of any developer
  action (adding a column, toggling a feature).
- **SC-004**: 90% of first-attempt agent-generated configurations require no manual
  correction before the table renders correctly.
- **SC-005**: The library builds independently with zero errors and the table component
  renders with correct Material styling without the consuming app installing
  Angular Material separately.
- **SC-006**: Invalid or missing configuration fields produce a descriptive error
  message — zero silent failures or blank renders.

## Assumptions

- The chat-based agent connects to an external AI model; the specific model and API are
  implementation details to be resolved during planning, not part of this spec.
- The GUI/TUI may be implemented as an in-browser tool, a standalone CLI tool, or an
  IDE extension; the form factor is an implementation decision for planning, not
  specified here.
- The library targets Angular 21 and Angular Material 21+; older versions are out of scope.
- "Complex tables" in the context of this library means tables with sortable, filterable,
  paginated columns and custom cell renderers; virtual scrolling and tree-tables are out
  of scope for this spec unless explicitly requested.
- The agent and GUI/TUI produce configuration objects only; they do not generate
  TypeScript source files or modify the developer's project directly.
