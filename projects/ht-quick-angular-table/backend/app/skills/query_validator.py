from __future__ import annotations

import sqlglot


def validate_readonly_query(sql: str) -> bool:
    """Validate that a SQL string contains only SELECT statements.

    Returns True if ALL statements are SELECT; False if any non-SELECT
    statement (INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE,
    GRANT, REVOKE, etc.) is detected.
    """
    try:
        statements = sqlglot.parse(sql)
    except sqlglot.errors.ErrorLevel:
        return False

    if not statements:
        return False

    # Filter out None entries (e.g., from empty string input)
    non_null = [s for s in statements if s is not None]
    if not non_null:
        return False

    for stmt in non_null:
        if not isinstance(stmt, sqlglot.exp.Select):
            return False

    return True
