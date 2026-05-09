# Tasks: Agent Data Skills

**Input**: Design documents from `/specs/003-agent-data-skills/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.yaml

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the Python backend project structure and shared Angular types

- [x] T001 Create Python backend directory structure at projects/ht-quick-angular-table/backend/ with app/, app/auth/, app/agent/, app/skills/, app/models/, tests/ subdirectories and __init__.py files
- [x] T002 Create pyproject.toml at projects/ht-quick-angular-table/backend/pyproject.toml with dependencies: fastapi>=0.115, uvicorn>=0.34, pandas>=2.2, fastexcel>=0.12, xlrd>=2.0, sqlalchemy>=2.0, asyncpg>=0.30, aiomysql>=0.2, aiosqlite>=0.20, pyjwt>=2.10, litellm>=1.55, httpx>=0.28, python-multipart, jsonpath-ng, sqlglot>=26.0; dev dependencies: pytest, pytest-asyncio, httpx (for TestClient)
- [x] T003 Create requirements.txt at projects/ht-quick-angular-table/backend/requirements.txt pinned from pyproject.toml
- [x] T004 [P] Create .env.example at projects/ht-quick-angular-table/backend/.env.example with LITELLM_MODEL, ANTHROPIC_API_KEY, JWT_SECRET, JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15, JWT_REFRESH_TOKEN_EXPIRE_DAYS=30, API_KEY, CORS_ORIGINS
- [x] T005 [P] Create Dockerfile at projects/ht-quick-angular-table/backend/Dockerfile with Python 3.11-slim base, pip install, uvicorn entrypoint on port 8000
- [x] T006 [P] Create shared TypeScript types at projects/ht-quick-angular-table/src/lib/skills/skill.types.ts defining Skill, SkillConfig (discriminated union: ExcelUploadConfig, ApiPullConfig, DatabaseConfig), SkillExecution, SkillExecutionStatus, SkillError, DataResult, ColumnDefinition, ResultMetadata per data-model.md
- [x] T007 [P] Create backend config interface at projects/ht-quick-angular-table/src/lib/backend/ht-backend.config.ts defining BackendConfig (backendUrl, apiKey) and HT_BACKEND_CONFIG injection token
- [x] T008 Update .gitignore to add projects/ht-quick-angular-table/backend/.venv/, projects/ht-quick-angular-table/backend/__pycache__/, projects/ht-quick-angular-table/backend/.env patterns

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend app, JWT auth, Pydantic models, and Angular backend proxy — MUST complete before any user story

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T009 Create Pydantic models at projects/ht-quick-angular-table/backend/app/models/auth.py with LoginRequest(apiKey: str), LoginResponse(accessToken: str, expiresIn: int)
- [x] T010 [P] Create Pydantic models at projects/ht-quick-angular-table/backend/app/models/data_result.py with ColumnDefinition(name, dataName, dataType), ResultMetadata(source, sheetName?, sheetNames?, apiStatusCode?, queryExecutionMs?), DataResult(columns, rows, totalRows, truncated, metadata?) per data-model.md
- [x] T011 [P] Create Pydantic models at projects/ht-quick-angular-table/backend/app/models/skill_config.py with ApiPullRequest(url, method, headers?, body?, jsonPath?), DatabaseQueryRequest(dbType, connectionString, query, rowLimit, timeoutSeconds) per contracts/api.yaml
- [x] T012 Create app config at projects/ht-quick-angular-table/backend/app/config.py using pydantic-settings BaseSettings reading from environment: JWT_SECRET, JWT_ACCESS_TOKEN_EXPIRE_MINUTES, JWT_REFRESH_TOKEN_EXPIRE_DAYS, API_KEY, LITELLM_MODEL, CORS_ORIGINS
- [x] T013 Create JWT service at projects/ht-quick-angular-table/backend/app/auth/jwt_service.py with create_access_token(), create_refresh_token(), verify_token() using PyJWT with HS256, configurable expiry
- [x] T014 Create auth dependencies at projects/ht-quick-angular-table/backend/app/auth/dependencies.py with get_current_user FastAPI dependency that extracts and verifies JWT from Authorization header
- [x] T015 Create auth router at projects/ht-quick-angular-table/backend/app/auth/router.py with POST /auth/login (validates API key, returns JWT + sets HttpOnly refresh cookie), POST /auth/refresh (validates refresh cookie, rotates tokens), POST /auth/logout (clears refresh cookie) per contracts/api.yaml
- [x] T016 Create FastAPI app entry at projects/ht-quick-angular-table/backend/app/main.py with CORS middleware (configurable origins), include auth router, health check endpoint at GET /health
- [x] T017 Create pytest conftest at projects/ht-quick-angular-table/backend/tests/conftest.py with FastAPI TestClient fixture, mock settings fixture, JWT token helper
- [x] T018 Create auth tests at projects/ht-quick-angular-table/backend/tests/test_auth.py testing: login with valid API key returns JWT, login with invalid key returns 401, refresh rotates tokens, protected endpoint rejects missing/expired token, logout clears cookie
- [x] T019 Create Angular backend service at projects/ht-quick-angular-table/src/lib/backend/ht-backend.service.ts with inject(HttpClient), methods: login(), refreshToken(), describeTable(), refineTable(), uploadExcel(), listSheets(), pullApiData(), queryDatabase(), testDatabaseConnection() — all delegating to Python backend REST endpoints
- [x] T020 Create Angular JWT interceptor at projects/ht-quick-angular-table/src/lib/backend/ht-backend.interceptor.ts as functional HttpInterceptorFn: attach Bearer token from in-memory signal, catch 401 → refresh → retry with request queue to prevent refresh storms
- [x] T021 Create Angular provider function at projects/ht-quick-angular-table/src/lib/backend/ht-backend.providers.ts exporting provideHtBackend(config: BackendConfig) that provides HT_BACKEND_CONFIG, registers htBackendInterceptor via withInterceptors()

**Checkpoint**: Backend starts, JWT auth works end-to-end, Angular proxy service compiles

---

## Phase 3: User Story 1 — Python Backend Service (Priority: P1) MVP

**Goal**: AI agent table builder works via Python backend instead of browser-side LLM SDKs

**Independent Test**: Send a table description to POST /agent/describe, receive valid TableSettings-compatible JSON

### Implementation for User Story 1

- [x] T022 [US1] Create LLM service at projects/ht-quick-angular-table/backend/app/agent/llm_service.py wrapping LiteLLM: generate(system_prompt, messages) → str, using the same SYSTEM_PROMPT logic from the existing HtTableBuilderService (table config JSON generation with validation rules)
- [x] T023 [US1] Create agent router at projects/ht-quick-angular-table/backend/app/agent/router.py with POST /agent/describe (message + sessionHistory → BuilderResponse) and POST /agent/refine (message + currentConfig + sessionHistory → BuilderResponse) per contracts/api.yaml, protected by JWT dependency
- [x] T024 [US1] Create agent tests at projects/ht-quick-angular-table/backend/tests/test_agent.py testing: describe returns valid table JSON (mock LiteLLM), describe returns clarification when AI asks question, refine updates existing config, unauthenticated request returns 401
- [x] T025 [US1] Modify HtTableBuilderService at projects/ht-quick-angular-table/src/lib/builder/ht-table-builder.service.ts to use inject(HtBackendService) instead of inject(HT_AI_PROVIDER): describe() calls backendService.describeTable(), refine() calls backendService.refineTable(). Remove createAiAdapter import and _callWithRetry private method. Keep _tryParseResponse, _buildTableSettings, _validateBuilderJson, _serializeTableSettings for response processing
- [x] T026 [US1] Delete browser-side AI adapter files: projects/ht-quick-angular-table/src/lib/ai/ai-provider.token.ts, ai-adapter.factory.ts, ai-model-adapter.interface.ts, ai-provider.helpers.ts, providers/claude.provider.ts, providers/gemini.provider.ts, and the entire ai/ directory
- [x] T027 [US1] Update public-api.ts at projects/ht-quick-angular-table/src/public-api.ts: remove all ai/* exports (AiModelAdapter, AiProviderConfig, HT_AI_PROVIDER, provideHtAi), add backend/* exports (HtBackendService, provideHtBackend, BackendConfig, HT_BACKEND_CONFIG), add skills/* exports (Skill, SkillConfig, ExcelUploadConfig, ApiPullConfig, DatabaseConfig, SkillExecution, DataResult, ColumnDefinition, HtSkillRegistryService, HtSkillMenuComponent)
- [x] T028 [US1] Update existing builder tests at projects/ht-quick-angular-table/src/lib/builder/ht-table-builder.service.spec.ts to mock HtBackendService instead of HT_AI_PROVIDER
- [x] T029 [US1] Run ng build ht-quick-angular-table and fix any compilation errors from the AI adapter removal and backend proxy integration
- [x] T030 [US1] Run ng test ht-quick-angular-table and fix any test failures
- [x] T031 [US1] Run pytest in projects/ht-quick-angular-table/backend/ and verify all backend tests pass

**Checkpoint**: Table builder works via Python backend. Browser-side LLM SDKs fully removed. Both ng build and pytest pass.

---

## Phase 4: User Story 5 — Skill Registry & Configuration (Priority: P2)

**Goal**: Developers can register data skills and users see a "Data Source" dropdown in the table toolbar

**Independent Test**: Register two skills, verify both appear in the toolbar dropdown menu

**Note**: US5 is implemented before US2/US3 because the registry + UI is required infrastructure for all skill UIs

### Implementation for User Story 5

- [x] T032 [US5] Create skill registry service at projects/ht-quick-angular-table/src/lib/skills/skill-registry.service.ts with: registerSkill(skill), unregisterSkill(id), getRegisteredSkills() signal, configureSkill(id, config), executeSkill(id) → Observable<SkillExecution>, currentExecution signal, prevention of concurrent executions (FR-026), result replaces table data (FR-027)
- [x] T033 [US5] Create skill menu component at projects/ht-quick-angular-table/src/lib/skills/skill-menu.component.ts + .html: standalone, OnPush, uses MatButtonModule + MatMenuModule + MatIconModule, renders "Data Source" button with dropdown listing registered skills, disables menu items during active execution, emits skillSelected output
- [x] T034 [US5] Create skill input components at projects/ht-quick-angular-table/src/lib/skills/inputs/: excel-input.component.ts (file picker with drag-drop, validates extension + size per FR-007), api-input.component.ts (form with URL, method, headers, JSONPath fields), database-input.component.ts (form with dbType, connectionString, query, rowLimit, timeout fields). All standalone, OnPush, using Angular Material form fields
- [x] T035 [US5] Integrate skill menu into table component: add <ht-skill-menu> to projects/ht-quick-angular-table/src/lib/ht-quick-angular-table.component.html toolbar area, wire skills input to registry, wire skillSelected to execution pipeline
- [x] T036 [US5] Create skill registry tests at projects/ht-quick-angular-table/src/lib/skills/skill-registry.service.spec.ts testing: registerSkill adds to registry, getRegisteredSkills returns registered only, concurrent execution prevention, executeSkill calls backend and returns DataResult, result replaces table data
- [x] T037 [US5] Create skill menu component tests at projects/ht-quick-angular-table/src/lib/skills/skill-menu.component.spec.ts testing: renders registered skills in dropdown, hides unregistered skills, disables during execution, emits on selection
- [x] T038 [US5] Run ng build ht-quick-angular-table and ng test ht-quick-angular-table — fix any failures

**Checkpoint**: Toolbar shows "Data Source" button. Registered skills appear in dropdown. Concurrent execution blocked.

---

## Phase 5: User Story 2 — Excel File Upload Skill (Priority: P1)

**Goal**: Users can upload Excel/CSV files and table auto-populates with parsed data

**Independent Test**: Upload a sample .xlsx file, verify table columns match headers and rows match data

### Implementation for User Story 2

- [x] T039 [US2] Create Excel service at projects/ht-quick-angular-table/backend/app/skills/excel_service.py: parse_excel(file, sheet_name?) → DataResult using pandas + fastexcel (calamine engine) for .xlsx, xlrd for .xls, pandas.read_csv for .csv. Auto-detect column types (string/number/date/boolean). Handle multi-sheet: list_sheets(file) → list[str]. Enforce row limit. Handle empty files, merged cells, irregular formatting gracefully
- [x] T040 [US2] Create skills router at projects/ht-quick-angular-table/backend/app/skills/router.py with POST /skills/excel/upload (multipart file + optional sheet param → DataResult), POST /skills/excel/sheets (multipart file → sheet list). Validate file extension (.xlsx, .xls, .csv) and size (configurable max, default 10 MB). Protected by JWT dependency
- [x] T041 [US2] Create Excel tests at projects/ht-quick-angular-table/backend/tests/test_excel.py testing: parse .xlsx with headers + data returns correct columns/rows, parse .csv returns correct data, multi-sheet lists all sheets, select specific sheet works, empty file (headers only) returns columns with zero rows, oversized file returns 413, invalid format returns 400, type inference (numbers/dates/booleans detected correctly)
- [x] T042 [US2] Add client-side file validation to skill registry Excel execution path in projects/ht-quick-angular-table/src/lib/skills/skill-registry.service.ts: validate file extension against allowedFormats, validate file size against maxFileSizeMb before uploading (FR-007)
- [x] T043 [US2] Add Excel upload method to HtBackendService at projects/ht-quick-angular-table/src/lib/backend/ht-backend.service.ts: uploadExcel(file, sheet?) → Observable<DataResult> using FormData multipart upload, listSheets(file) → Observable<string[]>
- [x] T044 [US2] Create sheet selection dialog component at projects/ht-quick-angular-table/src/lib/skills/sheet-select-dialog.component.ts: standalone, OnPush, uses MatDialogModule + MatSelectModule + MatButtonModule. When an uploaded Excel file has multiple sheets, display a dialog listing available sheet names (from listSheets() response metadata). User selects a sheet, dialog emits the selection, triggering a re-parse with the chosen sheet name (FR-010)
- [x] T045 [US2] Run pytest in projects/ht-quick-angular-table/backend/ and ng test ht-quick-angular-table — fix any failures

**Checkpoint**: Excel upload works end-to-end: select file → backend parses → table populates with data

---

## Phase 6: User Story 3 — API Data Pull Skill (Priority: P2)

**Goal**: Developers configure an external API endpoint; agent pulls JSON data and populates the table

**Independent Test**: Configure a public JSON API URL, trigger pull, verify table populates with API data

### Implementation for User Story 3

- [x] T046 [US3] Create API pull service at projects/ht-quick-angular-table/backend/app/skills/api_pull_service.py: pull_api_data(config: ApiPullRequest) → DataResult using httpx async client. Support GET/POST with headers and body. Apply JSONPath extraction via jsonpath-ng if jsonPath provided. Auto-detect column structure from JSON keys. Validate response is JSON. Handle timeouts, connection errors, non-200 responses with meaningful error messages (FR-012 through FR-016)
- [x] T047 [US3] Add API pull routes to projects/ht-quick-angular-table/backend/app/skills/router.py: POST /skills/api/pull (ApiPullRequest → DataResult). Validate URL format. Protected by JWT. Return 502 for upstream errors, 504 for timeouts
- [x] T048 [US3] Create API pull tests at projects/ht-quick-angular-table/backend/tests/test_api_pull.py testing: pull from mock API returns correct DataResult, JSONPath extraction works, auth headers forwarded correctly, non-JSON response returns 400, unreachable URL returns 502, timeout returns 504, nested JSON with JSONPath extracts correctly
- [x] T049 [US3] Add pullApiData method to HtBackendService at projects/ht-quick-angular-table/src/lib/backend/ht-backend.service.ts: pullApiData(config: ApiPullConfig) → Observable<DataResult>
- [x] T050 [US3] Run pytest in projects/ht-quick-angular-table/backend/ and ng test ht-quick-angular-table — fix any failures

**Checkpoint**: API pull works end-to-end: configure API → trigger pull → table populates with API response data

---

## Phase 7: User Story 4 — Database Connection Skill (Priority: P3)

**Goal**: Developers execute read-only database queries and table populates with result set

**Independent Test**: Connect to SQLite with a SELECT query, verify table populates with results

### Implementation for User Story 4

- [x] T051 [US4] Create query validator at projects/ht-quick-angular-table/backend/app/skills/query_validator.py: validate_readonly_query(sql: str) → bool using sqlglot to parse the SQL AST and verify all statements are SELECT (not INSERT/UPDATE/DELETE/DROP/ALTER/CREATE/TRUNCATE/GRANT/REVOKE). Handles multi-statement queries, CTEs, subqueries, and comments correctly. Rejects any non-SELECT statement type (FR-018)
- [x] T052 [US4] Create database service at projects/ht-quick-angular-table/backend/app/skills/database_service.py: query_database(config: DatabaseQueryRequest) → DataResult using SQLAlchemy 2.0 async engine. Build connection URL from dbType + connectionString. Use connection pooling (AsyncAdaptedQueuePool). Enforce read-only via query_validator before execution. Apply row limit and timeout. Map SQL result columns to ColumnDefinition with type inference. Handle connection failures without exposing credentials (FR-017 through FR-022)
- [x] T053 [US4] Add database routes to projects/ht-quick-angular-table/backend/app/skills/router.py: POST /skills/database/query (DatabaseQueryRequest → DataResult), POST /skills/database/test (dbType + connectionString → connected + serverVersion). Validate query is read-only before execution. Return 400 for write queries, 408 for timeouts, 502 for connection failures
- [x] T054 [US4] Create query validator tests at projects/ht-quick-angular-table/backend/tests/test_query_validator.py testing: SELECT allowed, INSERT/UPDATE/DELETE/DROP/ALTER/CREATE/TRUNCATE/GRANT/REVOKE rejected, case-insensitive detection, queries with leading whitespace/comments handled, subqueries with SELECT allowed, multi-statement with write rejected
- [x] T055 [US4] Create database service tests at projects/ht-quick-angular-table/backend/tests/test_database.py testing: SQLite in-memory SELECT returns correct DataResult, row limit enforced (truncated=true), query timeout returns error, invalid credentials return connection error without exposing details, write query rejected before execution, connection test returns server info
- [x] T056 [US4] Add queryDatabase and testDatabaseConnection methods to HtBackendService at projects/ht-quick-angular-table/src/lib/backend/ht-backend.service.ts: queryDatabase(config: DatabaseConfig) → Observable<DataResult>, testDatabaseConnection(dbType, connectionString) → Observable<{connected, serverVersion}>
- [x] T057 [US4] Run pytest in projects/ht-quick-angular-table/backend/ and ng test ht-quick-angular-table — fix any failures

**Checkpoint**: Database query works end-to-end: configure connection → execute SELECT → table populates. Write operations rejected.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final integration, build gates, and documentation

- [x] T058 Include backend/ directory in ng-package.json assets at projects/ht-quick-angular-table/ng-package.json so it ships with the npm package
- [x] T059 Update ht-software showcase app: modify table-demo component at projects/ht-software/src/app/demos/table-demo/table-demo.component.ts to use provideHtBackend() instead of provideHtAi(), remove any AI provider imports
- [x] T060 [P] Configure Python linting (ruff) and formatting (ruff format) for projects/ht-quick-angular-table/backend/ — add ruff to dev dependencies in pyproject.toml
- [x] T061 Run full ng build ht-quick-angular-table — verify zero errors with all changes
- [x] T062 Run full ng test ht-quick-angular-table — verify all Angular tests pass
- [x] T063 Run full pytest at projects/ht-quick-angular-table/backend/ — verify all Python tests pass
- [x] T064 Create MIGRATION.md at projects/ht-quick-angular-table/MIGRATION.md documenting breaking changes: removal of provideHtAi(), HT_AI_PROVIDER, AiModelAdapter, createAiAdapter(); replacement with provideHtBackend() + Python backend; step-by-step migration instructions from browser-side AI to backend proxy
- [x] T065 Run quickstart.md validation: verify the setup steps in specs/003-agent-data-skills/quickstart.md match the actual project structure and API surface: verify the setup steps in specs/003-agent-data-skills/quickstart.md match the actual project structure and API surface

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational — removes AI adapters, migrates builder to backend
- **US5 (Phase 4)**: Depends on Foundational — can run parallel with US1 but T035 integrates into table component
- **US2 (Phase 5)**: Depends on US1 (backend running) + US5 (skill registry exists)
- **US3 (Phase 6)**: Depends on US1 + US5 — can run parallel with US2
- **US4 (Phase 7)**: Depends on US1 + US5 — can run parallel with US2/US3
- **Polish (Phase 8)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Backend + builder migration. No dependency on other stories.
- **US5 (P2)**: Skill registry + UI. No dependency on US1 but logically follows it.
- **US2 (P1)**: Excel skill. Depends on US1 (backend) + US5 (registry).
- **US3 (P2)**: API pull skill. Depends on US1 (backend) + US5 (registry). Independent of US2.
- **US4 (P3)**: Database skill. Depends on US1 (backend) + US5 (registry). Independent of US2/US3.

### Within Each User Story

- Backend Pydantic models before services
- Backend services before routers
- Backend routers before Angular service methods
- Angular service methods before tests
- Tests and build verification at the end of each phase

### Parallel Opportunities

- T004, T005, T006, T007 in Phase 1 (different files)
- T009, T010, T011 in Phase 2 (different model files)
- US2, US3, US4 can run in parallel after US1 + US5 complete (different skill files)
- Within each skill: backend + Angular work in different files

---

## Parallel Example: Phase 5 (Excel Skill)

```bash
# Backend service + Angular method can be written in parallel:
Task: "Create Excel service in backend/app/skills/excel_service.py"     # Python
Task: "Add Excel upload method to HtBackendService"                      # TypeScript

# Tests after both are done:
Task: "Create Excel tests in backend/tests/test_excel.py"
Task: "Run pytest and ng test"
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (JWT auth + Angular proxy)
3. Complete Phase 3: US1 (backend builder + AI adapter removal)
4. **STOP and VALIDATE**: Builder works via Python backend, browser has no LLM keys

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. US1 (backend builder) → Test independently → Breaking change shipped
3. US5 (skill registry) → Test independently → UI ready for skills
4. US2 (Excel upload) → Test independently → First skill works
5. US3 (API pull) → Test independently → Second skill works
6. US4 (database query) → Test independently → Third skill works
7. Polish → Final validation → Release ready

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Python backend tests use pytest with FastAPI TestClient (sync wrapper for async)
- Angular tests use Jasmine/Karma with HttpClientTestingModule for backend service mocking
- The ai/ directory deletion (T026) is a breaking change — must be coordinated with public-api.ts update (T027)
- Database service tests use SQLite in-memory for portability (no PostgreSQL/MySQL needed in CI)
- All credential values in tests use dummy/mock values — never real credentials
