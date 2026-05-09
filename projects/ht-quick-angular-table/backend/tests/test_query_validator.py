from __future__ import annotations

import pytest

from app.skills.query_validator import validate_readonly_query


class TestQueryValidator:
    """Tests for validate_readonly_query."""

    @pytest.mark.parametrize("query", [
        "SELECT * FROM users",
        "SELECT id, name FROM users WHERE active = true",
        "SELECT * FROM users ORDER BY name LIMIT 10",
        "  SELECT * FROM users  ",
        "select * from users",  # case insensitive
        "WITH cte AS (SELECT * FROM users) SELECT * FROM cte",
    ])
    def test_select_allowed(self, query: str) -> None:
        assert validate_readonly_query(query) is True

    @pytest.mark.parametrize("query", [
        "INSERT INTO users (name) VALUES ('test')",
        "UPDATE users SET name = 'test'",
        "DELETE FROM users WHERE id = 1",
        "DROP TABLE users",
        "ALTER TABLE users ADD COLUMN email VARCHAR",
        "CREATE TABLE users (id INT)",
        "TRUNCATE TABLE users",
    ])
    def test_write_operations_rejected(self, query: str) -> None:
        assert validate_readonly_query(query) is False

    def test_multi_statement_with_write_rejected(self) -> None:
        assert validate_readonly_query("SELECT 1; DROP TABLE users") is False

    def test_empty_query(self) -> None:
        assert validate_readonly_query("") is False
