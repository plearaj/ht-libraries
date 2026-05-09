# Data Model: Agent Data Skills

**Feature Branch**: `003-agent-data-skills`
**Date**: 2026-03-04

## Entities

### 1. Skill

A named data-ingestion capability registered with the table agent.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | string | Unique, required | Skill identifier (e.g., `excel-upload`, `api-pull`, `database`) |
| name | string | Required, max 64 chars | Display name shown in toolbar dropdown |
| icon | string | Optional | Material icon name for the menu item |
| configSchema | SkillConfig | Required | Configuration for this skill instance |

**State transitions**: None (static registration at initialization)

### 2. SkillConfig (Union Type)

Developer-provided configuration for a specific skill. Discriminated union by `type` field.

#### ExcelUploadConfig

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| type | `'excel-upload'` | Literal | Discriminant |
| maxFileSizeMb | number | Default: 10, min: 1 | Maximum file size in MB |
| allowedFormats | string[] | Default: `['.xlsx', '.xls', '.csv']` | Accepted file extensions |

#### ApiPullConfig

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| type | `'api-pull'` | Literal | Discriminant |
| url | string | Required, valid URL | Target API endpoint |
| method | `'GET' \| 'POST'` | Default: `'GET'` | HTTP method |
| headers | Record<string, string> | Optional | Request headers (including auth) |
| body | unknown | Optional, only with POST | Request body |
| jsonPath | string | Optional | JSONPath expression for data extraction |

#### DatabaseConfig

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| type | `'database'` | Literal | Discriminant |
| dbType | `'postgresql' \| 'mysql' \| 'sqlite'` | Required | Database engine |
| connectionString | string | Required | Encrypted connection string |
| query | string | Required, read-only only | SQL SELECT query |
| rowLimit | number | Default: 10000, max: 100000 | Maximum rows returned |
| timeoutSeconds | number | Default: 30, max: 300 | Query timeout |

### 3. SkillExecution

A record of a skill invocation lifecycle.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | string | Auto-generated UUID | Execution identifier |
| skillId | string | FK → Skill.id | Which skill was invoked |
| status | SkillExecutionStatus | Required | Current execution state |
| startedAt | Date | Set on start | Execution start timestamp |
| completedAt | Date | Optional | Execution end timestamp |
| error | SkillError | Optional | Error details if failed |
| result | DataResult | Optional | Output data if completed |

**State transitions**:

```
pending → running → completed
                  → failed
```

- `pending`: Skill invoked, awaiting backend response
- `running`: Backend processing the request
- `completed`: Data received and applied to table
- `failed`: Error occurred (network, validation, backend)

### 4. SkillError

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| code | string | Required | Error category (e.g., `file-too-large`, `invalid-query`, `connection-failed`) |
| message | string | Required | User-facing error message |
| details | unknown | Optional | Additional context (never includes credentials) |

### 5. DataResult

Normalized output from any skill execution.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| columns | ColumnDefinition[] | Min 1 | Inferred column structure |
| rows | Record<string, unknown>[] | May be empty | Row data as key-value pairs |
| totalRows | number | >= 0 | Total row count (may exceed returned rows if truncated) |
| truncated | boolean | Required | Whether results were truncated by row limit |
| metadata | ResultMetadata | Optional | Source-specific metadata |

### 6. ColumnDefinition

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| name | string | Required, unique within result | Column display name |
| dataName | string | Required, alphanumeric + underscore | Column data key (camelCase) |
| dataType | `'string' \| 'number' \| 'date' \| 'boolean'` | Required | Inferred column type |

### 7. ResultMetadata

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| source | `'excel' \| 'api' \| 'database'` | Required | Data source type |
| sheetName | string | Excel only | Selected sheet name |
| sheetNames | string[] | Excel only | Available sheet names |
| apiStatusCode | number | API only | HTTP response status |
| queryExecutionMs | number | Database only | Query execution time |

### 8. BackendSession

Authenticated session between Angular client and Python backend.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| backendUrl | string | Required, valid URL | Python backend base URL |
| accessToken | string | In memory only | JWT access token |
| accessTokenExpiry | Date | Required | Token expiration timestamp |
| refreshTokenExpiry | Date | Optional | Refresh token expiry (cookie-managed) |
| isAuthenticated | boolean (computed) | Derived | Whether session is active |

**Note**: Refresh token is stored as HttpOnly cookie by the backend, not managed by Angular.

## Relationships

```
Skill 1──1 SkillConfig (each skill has exactly one config)
SkillExecution *──1 Skill (many executions per skill)
SkillExecution 0..1──1 DataResult (completed executions have a result)
SkillExecution 0..1──1 SkillError (failed executions have an error)
DataResult 1──* ColumnDefinition (result has many columns)
DataResult 0..1──1 ResultMetadata (result has optional metadata)
```

## Validation Rules

1. **ExcelUploadConfig**: `maxFileSizeMb` must be >= 1 and <= 100
2. **ApiPullConfig**: `url` must be a valid HTTP/HTTPS URL; `body` only allowed when `method` is `'POST'`
3. **DatabaseConfig**: `query` must be a valid SQL statement where all statement types are SELECT (validated via sqlglot AST parsing to handle CTEs, subqueries, multi-statement, and comments); `connectionString` must never be logged or transmitted to the browser
4. **ColumnDefinition**: `dataName` must match pattern `^[a-zA-Z_][a-zA-Z0-9_]*$`
5. **DataResult**: `columns` array must have at least 1 entry; `rows` values must only contain types matching the declared `dataType`
