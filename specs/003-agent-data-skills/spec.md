# Feature Specification: Agent Data Skills

**Feature Branch**: `003-agent-data-skills`
**Created**: 2026-03-02
**Status**: Draft
**Input**: User description: "I want to add three features the Table Building Agent. I want to allow the users to be able to upload data from excel files or have the agent call an API to pull data, or connect securely to a database. Each of these options should be setup as a skill or tool. Also for security I think the agent should be coded in Python and reached via as a traditional backend call versus using the angular sdk's for various llm providers"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Python Backend Service (Priority: P1)

A developer sets up a Python backend service that hosts the AI agent and exposes a secure REST API. The Angular frontend communicates with this backend instead of calling LLM provider SDKs directly from the browser. This eliminates client-side API key exposure, centralizes AI logic, and enables server-side data processing for all three data skills.

**Why this priority**: This is the foundational infrastructure that all three data skills depend on. Without the Python backend, no data skill can operate securely. It also addresses the user's primary security concern about removing browser-side LLM SDK calls.

**Independent Test**: Can be tested by deploying the Python backend, sending a table-building prompt via the REST API, and receiving a valid `TableSettings`-compatible JSON response — without any browser-side LLM SDK involvement.

**Acceptance Scenarios**:

1. **Given** a running Python backend with valid LLM credentials, **When** the Angular frontend sends a table description via the REST endpoint, **Then** the backend returns a valid table configuration JSON within the response timeout.
2. **Given** a request without valid authentication, **When** the Angular frontend calls the backend, **Then** the backend rejects the request with a clear authentication error.
3. **Given** the Python backend is unreachable, **When** the Angular frontend attempts a request, **Then** the frontend displays a user-friendly connectivity error and does not expose internal details.
4. **Given** a developer configuring the library, **When** they provide the backend URL and authentication details, **Then** the Angular service routes all AI requests through the Python backend instead of browser-side SDKs.

---

### User Story 2 - Excel File Upload Skill (Priority: P1)

A user uploads an Excel file (.xlsx, .xls, or .csv) through the table UI. The file is sent to the Python backend, which parses it, extracts column structure and row data, and returns a table configuration plus the parsed data. The table automatically populates with the uploaded content.

**Why this priority**: Excel upload is the most common and accessible data ingestion method. Most users have data in spreadsheets, and this skill delivers immediate standalone value with minimal infrastructure requirements beyond the Python backend.

**Independent Test**: Can be tested by uploading a sample Excel file, verifying the table auto-configures columns matching the spreadsheet headers, and confirming row data appears in the table.

**Acceptance Scenarios**:

1. **Given** an Excel file with headers and data rows, **When** the user uploads it via the file picker, **Then** the table displays columns matching the headers and rows matching the data.
2. **Given** a file exceeding the maximum allowed size (10 MB), **When** the user attempts to upload it, **Then** the system rejects the upload with a clear size limit message before sending to the backend.
3. **Given** a file with an unsupported format (e.g., .pdf), **When** the user attempts to upload it, **Then** the system rejects the file with a clear format error.
4. **Given** an Excel file with multiple sheets, **When** the user uploads it, **Then** the system uses the first sheet by default and provides the user the option to select a different sheet.
5. **Given** an Excel file containing 50,000+ rows, **When** the user uploads it, **Then** the system processes the file and paginates results without browser memory issues.

---

### User Story 3 - API Data Pull Skill (Priority: P2)

A developer configures the agent with an external API endpoint. The agent (via the Python backend) calls the API, retrieves JSON data, maps it to table columns, and populates the table. The developer provides the API URL, authentication headers, and optionally a JSONPath expression for extracting the relevant data array from the response.

**Why this priority**: API integration extends the table's usefulness to live, dynamic data sources. It is more complex than Excel upload because it involves endpoint configuration, authentication forwarding, and response mapping — but delivers high value for applications that consume external services.

**Independent Test**: Can be tested by configuring the agent with a public REST API endpoint (e.g., a mock JSON API), triggering the pull, and verifying the table populates with the returned data.

**Acceptance Scenarios**:

1. **Given** a valid API endpoint returning JSON array data, **When** the developer triggers the API pull, **Then** the table populates with columns inferred from the JSON keys and rows from the array items.
2. **Given** an API endpoint requiring authentication, **When** the developer provides auth headers in the skill configuration, **Then** the Python backend includes those headers when calling the API.
3. **Given** an API endpoint that returns nested JSON, **When** the developer provides a JSONPath expression, **Then** the system extracts data from the specified path.
4. **Given** an API endpoint that is unreachable or returns an error, **When** the agent attempts the pull, **Then** the system displays a meaningful error message and does not crash.
5. **Given** an API that returns non-JSON content, **When** the agent attempts the pull, **Then** the system reports a format incompatibility error.

---

### User Story 4 - Database Connection Skill (Priority: P3)

A developer configures the agent with database connection details (connection string or individual parameters). The agent (via the Python backend) connects securely to the database, executes a read-only query, and returns the result set as table data. Supported database types include PostgreSQL, MySQL, and SQLite.

**Why this priority**: Database connectivity is the most powerful data source but also the most complex and security-sensitive. It requires encrypted credential handling, query sanitization, and connection pooling — making it a natural P3 after simpler ingestion methods are proven.

**Independent Test**: Can be tested by configuring a SQLite database connection with a read-only query, triggering the skill, and verifying the table populates with the query result set.

**Acceptance Scenarios**:

1. **Given** valid database credentials and a SELECT query, **When** the developer triggers the database skill, **Then** the table populates with columns matching the query result columns and rows matching the result set.
2. **Given** a query containing write operations (INSERT, UPDATE, DELETE, DROP), **When** the developer submits it, **Then** the system rejects the query before execution with a clear "read-only" policy message.
3. **Given** invalid database credentials, **When** the agent attempts to connect, **Then** the system returns a connection error without exposing credential details in the error message.
4. **Given** a query returning more than 100,000 rows, **When** the agent executes it, **Then** the system enforces a configurable row limit and informs the user that results were truncated.
5. **Given** a query that takes longer than the configured timeout, **When** the agent executes it, **Then** the system cancels the query and returns a timeout error.

---

### User Story 5 - Skill Registry & Configuration (Priority: P2)

A developer registers available data skills (Excel upload, API pull, database connection) with the table agent through a declarative configuration. The agent exposes available skills in its UI and allows the user to invoke them. Skills are modular — developers can enable any combination of the three skills.

**Why this priority**: The registry provides the architectural glue that makes skills discoverable and composable. Without it, each skill would need its own hard-coded integration point. This is P2 because it should be designed alongside the first skill (Excel) but fully realized after at least two skills exist.

**Independent Test**: Can be tested by registering two skills (e.g., Excel upload and API pull) and verifying both appear in the agent's skill menu, while a third unregistered skill does not appear.

**Acceptance Scenarios**:

1. **Given** a developer registering Excel and API skills, **When** the table agent initializes, **Then** the UI presents both skill options to the user.
2. **Given** a developer registering only the Excel skill, **When** the table agent initializes, **Then** only the Excel skill option appears and others are absent.
3. **Given** a user selecting a skill from the menu, **When** the skill requires input (e.g., file selection or URL entry), **Then** the appropriate input interface is presented.
4. **Given** a skill execution in progress, **When** the user attempts to invoke another skill, **Then** the system rejects the invocation and displays a message informing the user that a skill is currently running.

---

### Edge Cases

- What happens when an uploaded Excel file contains no data rows (headers only)?
- What happens when an API returns an empty array?
- What happens when the database query returns zero rows?
- What happens when the Python backend goes down mid-request?
- What happens when an Excel file has merged cells or irregular formatting?
- What happens when the user's network connection drops during a large file upload?
- What happens when two users simultaneously invoke different skills on the same table instance?
- What happens when the database connection pool is exhausted?
- What happens when an API response exceeds the maximum payload size?
- What happens when column types in the data conflict with an existing table configuration?

## Requirements *(mandatory)*

### Functional Requirements

#### Python Backend

- **FR-001**: System MUST provide a Python backend service that hosts the AI agent and exposes a REST API for table operations.
- **FR-002**: System MUST authenticate all requests between the Angular frontend and Python backend using JWT (JSON Web Token) authentication. The backend issues short-lived access tokens; the Angular service manages token refresh transparently.
- **FR-003**: System MUST NOT expose any LLM provider API keys or credentials to the browser client.
- **FR-004**: System MUST provide an Angular service that acts as a client proxy to the Python backend, fully replacing the existing browser-side `HT_AI_PROVIDER` adapter. The browser-side AI SDK integration will be removed.
- **FR-005**: System MUST support configurable backend URL so developers can deploy the Python service independently.

#### Excel Upload Skill

- **FR-006**: System MUST accept file uploads in .xlsx, .xls, and .csv formats.
- **FR-007**: System MUST validate file size (max 10 MB) and format on the client side before uploading.
- **FR-008**: System MUST parse uploaded files on the Python backend and return structured column definitions and row data.
- **FR-009**: System MUST auto-detect column data types (string, number, date, boolean) from file content.
- **FR-010**: System MUST handle multi-sheet Excel files by defaulting to the first sheet and allowing sheet selection.
- **FR-011**: System MUST handle files with up to 100,000 rows. The backend reads the file in a single pass using the fastexcel/calamine engine (memory-efficient Rust-based parser) and enforces a configurable row limit (default: 100,000) to cap memory usage. Rows beyond the limit are discarded and the response indicates truncation.

#### API Data Pull Skill

- **FR-012**: System MUST allow developers to configure an API endpoint URL, HTTP method (GET/POST), and optional request headers.
- **FR-013**: System MUST support authentication header forwarding from the skill configuration to the target API.
- **FR-014**: System MUST support JSONPath expressions for extracting data arrays from nested API responses.
- **FR-015**: System MUST auto-detect column structure from JSON keys in the response data.
- **FR-016**: System MUST validate that the API response is valid JSON before attempting to parse it.

#### Database Connection Skill

- **FR-017**: System MUST support connections to PostgreSQL, MySQL, and SQLite databases.
- **FR-018**: System MUST enforce read-only query execution — rejecting any write, DDL, or DCL statements.
- **FR-019**: System MUST encrypt database credentials in transit (HTTPS/TLS) and never log or include connection strings in error responses. Database credentials are stored only in backend environment variables or encrypted configuration — never persisted to disk by the application.
- **FR-020**: System MUST enforce a configurable row limit on query results (default: 10,000 rows).
- **FR-021**: System MUST enforce a configurable query timeout (default: 30 seconds).
- **FR-022**: System MUST use connection pooling to manage database connections efficiently.

#### Skill Registry

- **FR-023**: System MUST provide a skill registry that allows developers to declaratively register available data skills.
- **FR-024**: System MUST present registered skills as selectable options via a "Data Source" toolbar button with a dropdown menu in the table component toolbar.
- **FR-025**: System MUST allow developers to enable any combination of the three skills independently.
- **FR-026**: System MUST prevent concurrent skill executions on the same table instance by rejecting new invocations with a user-visible message ("A skill is currently running. Please wait for it to complete.") while another execution is in progress.
- **FR-027**: When a skill execution completes, the resulting data MUST fully replace the current table data and column configuration. Previous data is discarded.

### Non-Functional Requirements

- **NFR-001**: File uploads of 5 MB or less MUST complete processing within 10 seconds.
- **NFR-002**: API data pulls MUST return results within 15 seconds for endpoints responding within 5 seconds.
- **NFR-003**: Database queries MUST return results within the configured timeout plus 2 seconds of overhead.
- **NFR-004**: The Python backend MUST handle at least 50 concurrent requests without degradation.
- **NFR-005**: All data in transit between Angular frontend and Python backend MUST use HTTPS/TLS.

### Key Entities

- **Skill**: A named data-ingestion capability (Excel, API, Database) with its configuration schema, execution logic, and UI component.
- **SkillConfig**: The developer-provided configuration for a specific skill instance (e.g., API URL + headers, database connection string).
- **SkillExecution**: A record of a skill invocation including status (pending, running, completed, failed), input parameters, and result metadata.
- **DataResult**: The normalized output from any skill execution containing column definitions (name, inferred type) and row data arrays.
- **BackendSession**: The authenticated session between the Angular client and Python backend, including JWT access token, refresh token, token expiry, and endpoint configuration.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can upload an Excel file and see the table populated with correct data within 10 seconds for files under 5 MB.
- **SC-002**: A developer can configure and execute an API data pull with results appearing in the table on the first attempt, given a valid endpoint.
- **SC-003**: A developer can execute a read-only database query and see results in the table, with write operations consistently rejected.
- **SC-004**: No LLM provider API keys or database credentials are ever transmitted to or accessible from the browser client.
- **SC-005**: All three skills can be independently enabled/disabled without code changes — configuration only.
- **SC-006**: The Python backend processes at least 50 concurrent skill requests without error rate exceeding 1%.
- **SC-007**: Developers can set up the complete system (Angular library + Python backend) and run their first data skill within 30 minutes following the quickstart guide.

## Clarifications

### Session 2026-03-04

- Q: How should the Angular frontend authenticate with the Python backend? → A: JWT — backend issues short-lived JWT tokens; Angular service manages refresh.
- Q: When a skill populates the table, what happens if another skill is executed afterward? → A: Replace — new skill results fully replace the current table data.
- Q: Should the existing browser-side AI builder continue to work as a fallback? → A: Full replacement — remove browser-side AI adapter; Python backend is the only path (breaking change).
- Q: How should the Python backend source code be distributed to developers? → A: Subdirectory in npm package — Python code ships in `ht-quick-angular-table/backend/`.
- Q: Where should the skill selection UI appear within the existing table component? → A: Toolbar button + dropdown — a "Data Source" button in the table toolbar opens a dropdown menu.

## Assumptions

- The Python backend will be deployed as a standalone service (e.g., via Docker or a cloud platform) — it is not embedded in the Angular application.
- Developers are responsible for providing their own LLM provider API keys to the Python backend configuration.
- The existing `HtTableAgentService` action/trigger architecture will be extended (not replaced) to support skill invocations.
- The existing `HtTableBuilderService` browser-side AI adapter (`HT_AI_PROVIDER`, `createAiAdapter`) will be fully removed and replaced by the Python backend proxy. This is a breaking change for existing users of `provideHtAi()`. The builder's `TableSettings` output format remains the target schema.
- Database credentials are provided by the developer at configuration time — end users do not enter credentials directly.
- The Python backend source code will be distributed as a subdirectory (`backend/`) within the `ht-quick-angular-table` npm package. Developers copy or reference this directory for deployment. Hosting is the developer's responsibility.
- File size limits (10 MB for Excel) are initial defaults and can be overridden by backend configuration.
