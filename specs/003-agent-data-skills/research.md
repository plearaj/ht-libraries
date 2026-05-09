# Research: Agent Data Skills

**Feature Branch**: `003-agent-data-skills`
**Date**: 2026-03-04

## 1. Python Web Framework

**Decision**: FastAPI

**Rationale**: Async-native (Starlette/uvloop), handles 50+ concurrent requests in a single worker, first-class file upload support, Pydantic validation, minimal Docker footprint. Used in production at Anthropic and OpenAI for similar workloads.

**Alternatives considered**:
- Flask: Synchronous WSGI model requires many workers for concurrency. Rejected.
- Django: Heavyweight, ORM-coupled, overkill for a REST API service. Rejected.
- Litestar: Genuine contender (slightly faster startup), but FastAPI's larger ecosystem and better AI/LLM integrations make it lower-risk. Revisit if performance becomes a bottleneck.

## 2. Excel Parsing

**Decision**: pandas + fastexcel (calamine/Rust engine) + xlrd for legacy .xls

**Rationale**: `pandas.read_excel(engine="calamine")` via `fastexcel` is 6x faster than openpyxl for large files (100K rows in ~2.6s vs ~14s). Multi-sheet support via `sheet_name=None`. Built-in type inference. For legacy `.xls`, fall back to `xlrd`.

**Alternatives considered**:
- openpyxl alone: No DataFrame API, no type inference, slow. Rejected.
- Polars: 65% faster than pandas+calamine but less familiar API and less pandas-centric ecosystem integration. Revisit if hot path.
- xlwings: Requires running Excel process (Windows only). Rejected for Docker/Linux.

## 3. Database Connectivity

**Decision**: SQLAlchemy 2.0 (async) with dialect-specific drivers (asyncpg, aiomysql, aiosqlite)

**Rationale**: Unified API across PostgreSQL, MySQL, SQLite. `AsyncAdaptedQueuePool` for async connection pooling. Read-only enforcement via `SessionEvents.do_orm_execute` hook + `SET TRANSACTION READ ONLY` on PostgreSQL. Query timeouts via driver-level `execution_options`.

**Alternatives considered**:
- asyncpg directly: Best PostgreSQL performance but no MySQL/SQLite. Rejected.
- Databases (encode): Less maintained, lacks full features. Rejected.
- Tortoise ORM: Smaller ecosystem, less raw query control for read-only enforcement. Rejected.

## 4. JWT Authentication

**Decision**: PyJWT (backend) + Angular functional HttpInterceptor (frontend)

**Rationale**: PyJWT is the de facto standard — minimal, actively maintained, supports HS256/RS256. Angular interceptor transparently handles token refresh with request queueing to prevent refresh storms.

**Token strategy**:
- Access token: 15 minutes, stored in memory (Angular signal)
- Refresh token: 30 days, stored in HttpOnly cookie (`Secure`, `SameSite=Strict`)
- Silent refresh: triggered 1 minute before access token expiry
- Refresh token rotation: each refresh issues new token, old one invalidated

**Alternatives considered**:
- python-jose: Less maintained, extra surface area not needed. Rejected.
- Authlib: Full OAuth2 framework, overkill for simple JWT issuance. Rejected.
- localStorage for tokens: Explicitly insecure (XSS vulnerable). Rejected.

## 5. LLM Client

**Decision**: LiteLLM

**Rationale**: Single unified interface for 100+ LLM providers (Claude + Gemini) using OpenAI-compatible call signature. Built-in retries, cost tracking, streaming, fallbacks. Eliminates maintaining two separate SDK integrations.

**Alternatives considered**:
- anthropic + google-generativeai separately: Two different APIs, duplicate error handling, more maintenance. Rejected.
- LangChain: Heavyweight, designed for chains/agents, not raw API proxying. Rejected.

## 6. Angular Frontend Integration

**Decision**: Backend proxy service replaces `HT_AI_PROVIDER` adapter

**Rationale**: The Angular library will provide:
1. `HtBackendService` — Angular service wrapping HttpClient calls to the Python backend
2. `htBackendInterceptor` — functional HttpInterceptor for JWT auth + refresh
3. `provideHtBackend(config)` — provider function replacing `provideHtAi()`

The existing `HT_AI_PROVIDER` token, `createAiAdapter()` factory, and per-provider adapters will be removed (breaking change).

**Key design decisions**:
- Library provides interceptor but does NOT manage token state (consumers own storage)
- Library remains stateless per constitution (Principle I)
- `HtBackendService` is `providedIn: 'root'`, uses `inject(HttpClient)`

## 7. Project Structure

**Decision**: Hybrid — Python backend as subdirectory within Angular library source

The Python backend source lives at `projects/ht-quick-angular-table/backend/` in the repo, and is included in the npm package distribution. This keeps everything in one repo while maintaining clear separation.

```
projects/ht-quick-angular-table/
├── backend/                    # Python FastAPI backend
│   ├── pyproject.toml
│   ├── Dockerfile
│   ├── app/
│   │   ├── main.py            # FastAPI app entry
│   │   ├── auth/              # JWT auth endpoints
│   │   ├── skills/            # Skill implementations
│   │   │   ├── excel.py
│   │   │   ├── api_pull.py
│   │   │   └── database.py
│   │   ├── agent/             # LLM agent (table builder)
│   │   └── models/            # Pydantic models
│   └── tests/
├── src/lib/
│   ├── backend/               # Angular backend proxy service
│   │   ├── ht-backend.service.ts
│   │   ├── ht-backend.interceptor.ts
│   │   └── ht-backend.providers.ts
│   ├── skills/                # Angular skill registry + UI
│   │   ├── skill-registry.service.ts
│   │   ├── skill-menu.component.ts
│   │   └── skill.types.ts
│   └── ...existing code...
```

## Summary

| Concern | Decision | Package/Version |
|---------|----------|----------------|
| Web framework | FastAPI | fastapi >=0.115 |
| ASGI server | Uvicorn | uvicorn >=0.34 |
| Excel parsing | pandas + fastexcel | pandas >=2.2, fastexcel >=0.12 |
| Legacy .xls | xlrd | xlrd >=2.0 |
| Database ORM | SQLAlchemy 2.0 async | sqlalchemy >=2.0 |
| PostgreSQL driver | asyncpg | asyncpg >=0.30 |
| MySQL driver | aiomysql | aiomysql >=0.2 |
| SQLite driver | aiosqlite | aiosqlite >=0.20 |
| JWT | PyJWT | pyjwt >=2.10 |
| LLM client | LiteLLM | litellm >=1.55 |
| HTTP client | httpx | httpx >=0.28 |
