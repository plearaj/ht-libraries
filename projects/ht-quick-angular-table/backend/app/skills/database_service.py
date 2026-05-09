from __future__ import annotations

import asyncio
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.models.data_result import ColumnDefinition, DataResult, ResultMetadata
from app.models.skill_config import DatabaseQueryRequest, DatabaseTestResponse


def _build_connection_url(db_type: str, connection_string: str) -> str:
    """Build an async-compatible SQLAlchemy URL."""
    if db_type == "postgresql":
        # Convert postgresql:// to postgresql+asyncpg://
        if connection_string.startswith("postgresql://"):
            return connection_string.replace("postgresql://", "postgresql+asyncpg://", 1)
        return f"postgresql+asyncpg://{connection_string}"
    elif db_type == "mysql":
        if connection_string.startswith("mysql://"):
            return connection_string.replace("mysql://", "mysql+aiomysql://", 1)
        return f"mysql+aiomysql://{connection_string}"
    elif db_type == "sqlite":
        if connection_string.startswith("sqlite://"):
            return connection_string.replace("sqlite://", "sqlite+aiosqlite://", 1)
        return f"sqlite+aiosqlite:///{connection_string}"
    raise ValueError(f"Unsupported database type: {db_type}")


def _infer_type(value: Any) -> str:
    """Infer column data type from a Python value."""
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, (int, float)):
        return "number"
    return "string"


async def query_database(config: DatabaseQueryRequest) -> DataResult:
    """Execute a read-only SQL query and return results as DataResult."""
    url = _build_connection_url(config.db_type, config.connection_string)
    engine = create_async_engine(url, pool_pre_ping=True)

    try:
        async with engine.connect() as conn:
            result = await asyncio.wait_for(
                conn.execute(text(config.query)),
                timeout=config.timeout_seconds or 30,
            )
            col_names = list(result.keys())
            all_rows = result.fetchall()

            row_limit = config.row_limit or 10000
            truncated = len(all_rows) > row_limit
            if truncated:
                all_rows = all_rows[:row_limit]

            # Build columns from first row
            columns: list[ColumnDefinition] = []
            if all_rows:
                first_row = all_rows[0]
                for i, name in enumerate(col_names):
                    columns.append(
                        ColumnDefinition(
                            name=name,
                            data_name=name,
                            data_type=_infer_type(first_row[i]),
                        )
                    )
            else:
                columns = [
                    ColumnDefinition(name=name, data_name=name, data_type="string")
                    for name in col_names
                ]

            rows = [dict(zip(col_names, row)) for row in all_rows]

            return DataResult(
                columns=columns,
                rows=rows,
                total_rows=len(all_rows),
                truncated=truncated,
                metadata=ResultMetadata(source="database"),
            )
    except asyncio.TimeoutError as exc:
        raise TimeoutError("Query execution timed out") from exc
    except Exception as exc:
        # Sanitize error: never expose credentials
        msg = str(exc)
        if "@" in msg or "password" in msg.lower():
            msg = "Database connection failed"
        raise ConnectionError(msg) from exc
    finally:
        await engine.dispose()


async def test_connection(db_type: str, connection_string: str) -> DatabaseTestResponse:
    """Test database connectivity and return server version."""
    url = _build_connection_url(db_type, connection_string)
    engine = create_async_engine(url, pool_pre_ping=True)

    try:
        async with engine.connect() as conn:
            if db_type == "sqlite":
                result = await conn.execute(text("SELECT sqlite_version()"))
                version = result.scalar() or "unknown"
            elif db_type == "postgresql":
                result = await conn.execute(text("SELECT version()"))
                version = result.scalar() or "unknown"
            else:  # mysql
                result = await conn.execute(text("SELECT version()"))
                version = result.scalar() or "unknown"

            return DatabaseTestResponse(connected=True, server_version=str(version))
    except Exception as exc:
        msg = str(exc)
        if "@" in msg or "password" in msg.lower():
            msg = "Connection failed"
        raise ConnectionError(msg) from exc
    finally:
        await engine.dispose()
