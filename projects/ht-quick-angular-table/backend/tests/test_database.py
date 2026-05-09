from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


class TestDatabaseQuery:
    """Tests for POST /skills/database/query."""

    def test_sqlite_select(self, client: TestClient, auth_headers: dict) -> None:
        """Query an in-memory SQLite database."""
        response = client.post(
            "/skills/database/query",
            json={
                "dbType": "sqlite",
                "connectionString": ":memory:",
                "query": "SELECT 1 AS id, 'Alice' AS name",
                "rowLimit": 100,
                "timeoutSeconds": 5,
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        result = response.json()
        assert len(result["columns"]) == 2
        assert result["rows"][0]["id"] == 1
        assert result["rows"][0]["name"] == "Alice"

    def test_write_query_rejected(self, client: TestClient, auth_headers: dict) -> None:
        """Write queries should be rejected before execution."""
        response = client.post(
            "/skills/database/query",
            json={
                "dbType": "sqlite",
                "connectionString": ":memory:",
                "query": "DROP TABLE IF EXISTS users",
                "rowLimit": 100,
                "timeoutSeconds": 5,
            },
            headers=auth_headers,
        )
        assert response.status_code == 400

    def test_unauthenticated_returns_401(self, client: TestClient) -> None:
        response = client.post(
            "/skills/database/query",
            json={
                "dbType": "sqlite",
                "connectionString": ":memory:",
                "query": "SELECT 1",
            },
        )
        assert response.status_code == 401


class TestDatabaseTest:
    """Tests for POST /skills/database/test."""

    def test_sqlite_connection(self, client: TestClient, auth_headers: dict) -> None:
        response = client.post(
            "/skills/database/test",
            json={"dbType": "sqlite", "connectionString": ":memory:"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        result = response.json()
        assert result["connected"] is True
        assert isinstance(result["serverVersion"], str)
