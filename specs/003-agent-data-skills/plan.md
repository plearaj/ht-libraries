# Implementation Plan: Agent Data Skills

**Branch**: `003-agent-data-skills` | **Date**: 2026-03-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-agent-data-skills/spec.md`

## Summary

Add three data-ingestion skills (Excel upload, API pull, database query) to the ht-quick-angular-table agent. Replace the browser-side LLM SDK integration with a Python (FastAPI) backend that hosts the AI agent and all data processing. The Angular library provides a backend proxy service, JWT authentication interceptor, skill registry, and toolbar UI for skill selection.

## Technical Context

**Language/Version**: TypeScript 5.6 / Angular 21 (frontend), Python 3.11+ (backend)
**Primary Dependencies**:
- Frontend: `@angular/common/http`, Angular Material (toolbar, menu)
- Backend: FastAPI, pandas + fastexcel, SQLAlchemy 2.0 async, PyJWT, LiteLLM, httpx
**Storage**: PostgreSQL, MySQL, SQLite (via SQLAlchemy async drivers: asyncpg, aiomysql, aiosqlite)
**Testing**: Jasmine/Karma (Angular), pytest + pytest-asyncio (Python)
**Target Platform**: Browser (Angular library) + Linux/Docker (Python backend)
**Project Type**: Hybrid — Angular library with embedded Python backend subdirectory
**Performance Goals**: 50+ concurrent requests, <10s Excel processing for 5 MB files, <15s API pulls
**Constraints**: No credentials in browser, HTTPS/TLS required, read-only database queries only
**Scale/Scope**: Up to 100,000 rows per skill execution, 10 MB max file upload

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Library-First Architecture | JUSTIFIED VIOLATION | Python backend is a subdirectory within the Angular library package, not a separate project. It ships as part of `ht-quick-angular-table` npm distribution. See Complexity Tracking. |
| II. Modern Angular Patterns | PASS | All new Angular code uses `inject()`, signal API, `OnPush`, native control flow. |
| III. Minimal & Stable Public API | JUSTIFIED VIOLATION | Removing `HT_AI_PROVIDER` and `provideHtAi()` is a breaking change. This was an explicit user decision (full replacement, not deprecation). Migration note required. |
| IV. Build & Test Gate | PASS | Both `ng build` and `ng test` plus `pytest` must pass. |
| V. DRY, YAGNI & KISS | PASS | Three skills share a common `DataResult` schema and registry pattern. No speculative abstractions. |

### Post-Phase 1 Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Library-First Architecture | PASS (with justification) | Python backend ships inside the library's npm package as `backend/` subdirectory. It's self-contained with its own `pyproject.toml` and `Dockerfile`. The library itself remains independently buildable with `ng build`. |
| II. Modern Angular Patterns | PASS | `HtBackendService` uses `inject(HttpClient)`. Skill registry uses signals. Toolbar menu uses native control flow. |
| III. Minimal & Stable Public API | PASS (with migration) | New public API: `provideHtBackend()`, `HtBackendService`, `HtSkillRegistryService`, `HtSkillMenuComponent`. Removed: `provideHtAi()`, `HT_AI_PROVIDER`, `createAiAdapter()`. Migration note documenting the breaking change. |
| IV. Build & Test Gate | PASS | Angular tests via Karma, Python tests via pytest. Both required for completion. |
| V. DRY, YAGNI & KISS | PASS | Shared `DataResult` model avoids duplicating column/row types per skill. Skill registry is generic but only serves the 3 concrete skills requested. |

## Project Structure

### Documentation (this feature)

```text
specs/003-agent-data-skills/
├── plan.md              # This file
├── research.md          # Phase 0 output — tech stack decisions
├── data-model.md        # Phase 1 output — entity definitions
├── quickstart.md        # Phase 1 output — integration guide
├── contracts/
│   └── api.yaml         # Phase 1 output — OpenAPI 3.1 spec
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
projects/ht-quick-angular-table/
├── backend/                          # Python FastAPI backend (NEW)
│   ├── pyproject.toml                # Python project config + dependencies
│   ├── requirements.txt             # Pinned dependencies for pip
│   ├── Dockerfile                   # Docker build for deployment
│   ├── .env.example                 # Environment variable template
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI app entry + CORS + middleware
│   │   ├── config.py                # Settings from environment variables
│   │   ├── auth/
│   │   │   ├── __init__.py
│   │   │   ├── router.py            # /auth/login, /auth/refresh, /auth/logout
│   │   │   ├── jwt_service.py       # JWT creation + validation (PyJWT)
│   │   │   └── dependencies.py      # FastAPI dependency for JWT verification
│   │   ├── agent/
│   │   │   ├── __init__.py
│   │   │   ├── router.py            # /agent/describe, /agent/refine
│   │   │   └── llm_service.py       # LiteLLM wrapper for table generation
│   │   ├── skills/
│   │   │   ├── __init__.py
│   │   │   ├── router.py            # /skills/excel/*, /skills/api/*, /skills/database/*
│   │   │   ├── excel_service.py     # pandas + fastexcel parsing
│   │   │   ├── api_pull_service.py  # httpx external API calls
│   │   │   ├── database_service.py  # SQLAlchemy async query execution
│   │   │   └── query_validator.py   # Read-only SQL validation
│   │   └── models/
│   │       ├── __init__.py
│   │       ├── data_result.py       # DataResult, ColumnDefinition Pydantic models
│   │       ├── skill_config.py      # ExcelUploadConfig, ApiPullConfig, DatabaseConfig
│   │       └── auth.py              # LoginRequest, LoginResponse
│   └── tests/
│       ├── conftest.py              # pytest fixtures (FastAPI TestClient, mock DB)
│       ├── test_auth.py             # JWT auth endpoint tests
│       ├── test_excel.py            # Excel parsing tests
│       ├── test_api_pull.py         # API pull tests (httpx mocking)
│       ├── test_database.py         # Database query tests (SQLite in-memory)
│       ├── test_query_validator.py  # Read-only SQL validation tests
│       └── test_agent.py            # LLM agent tests (mocked LiteLLM)
│
├── src/lib/
│   ├── backend/                     # Angular backend proxy (NEW)
│   │   ├── ht-backend.service.ts    # HttpClient wrapper for Python backend
│   │   ├── ht-backend.interceptor.ts # JWT auth interceptor with refresh
│   │   ├── ht-backend.providers.ts  # provideHtBackend() provider function
│   │   ├── ht-backend.config.ts     # BackendConfig interface
│   │   └── ht-backend.service.spec.ts
│   │
│   ├── skills/                      # Skill registry + UI (NEW)
│   │   ├── skill.types.ts           # Skill, SkillConfig, SkillExecution, DataResult types
│   │   ├── skill-registry.service.ts # Skill registration + invocation
│   │   ├── skill-menu.component.ts  # "Data Source" toolbar dropdown
│   │   ├── skill-menu.component.html
│   │   ├── skill-registry.service.spec.ts
│   │   └── skill-menu.component.spec.ts
│   │
│   ├── ai/                          # REMOVED (breaking change)
│   │   ├── ai-provider.token.ts     # → DELETED
│   │   ├── ai-adapter.factory.ts    # → DELETED
│   │   ├── ai-adapter.interface.ts  # → DELETED
│   │   ├── claude-adapter.ts        # → DELETED
│   │   └── gemini-adapter.ts        # → DELETED
│   │
│   ├── builder/
│   │   └── ht-table-builder.service.ts  # MODIFIED: uses HtBackendService instead of AI adapter
│   │
│   └── ...existing code unchanged...
│
└── src/public-api.ts                # MODIFIED: remove ai/* exports, add backend/* and skills/*
```

**Structure Decision**: Hybrid frontend+backend within the existing `ht-quick-angular-table` library project. The Python backend is a self-contained subdirectory (`backend/`) with its own dependency management, testing, and Docker build. The Angular library remains independently buildable. The `ai/` directory is removed entirely (breaking change per user decision).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Python backend inside Angular library | User explicitly requested Python for security (no browser-side LLM keys). Backend must be tightly coupled to the library's API contract. | Separate repo would fragment maintenance and version alignment. Separate PyPI package adds install complexity. |
| Breaking change: remove `provideHtAi()` | User chose full replacement over dual-mode or deprecation. Simplifies codebase by removing browser-side SDK integration entirely. | Keeping both paths violates KISS — two code paths for the same operation with different security properties. |
