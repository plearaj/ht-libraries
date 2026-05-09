from __future__ import annotations

from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient


class TestApiPull:
    """Tests for POST /skills/api/pull."""

    def test_pull_returns_data(self, client: TestClient, auth_headers: dict) -> None:
        mock_response = httpx.Response(
            200,
            json=[{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}],
        )
        with patch("app.skills.api_pull_service.httpx.AsyncClient") as mock_client:
            instance = AsyncMock()
            instance.get = AsyncMock(return_value=mock_response)
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=False)
            mock_client.return_value = instance

            response = client.post(
                "/skills/api/pull",
                json={"url": "https://api.example.com/data", "method": "GET"},
                headers=auth_headers,
            )

        assert response.status_code == 200
        result = response.json()
        assert len(result["columns"]) >= 1
        assert len(result["rows"]) == 2

    def test_jsonpath_extraction(self, client: TestClient, auth_headers: dict) -> None:
        mock_response = httpx.Response(
            200,
            json={"data": {"items": [{"id": 1}, {"id": 2}]}},
        )
        with patch("app.skills.api_pull_service.httpx.AsyncClient") as mock_client:
            instance = AsyncMock()
            instance.get = AsyncMock(return_value=mock_response)
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=False)
            mock_client.return_value = instance

            response = client.post(
                "/skills/api/pull",
                json={
                    "url": "https://api.example.com/data",
                    "method": "GET",
                    "jsonPath": "$.data.items[*]",
                },
                headers=auth_headers,
            )

        assert response.status_code == 200
        result = response.json()
        assert len(result["rows"]) == 2

    def test_unauthenticated_returns_401(self, client: TestClient) -> None:
        response = client.post(
            "/skills/api/pull",
            json={"url": "https://api.example.com", "method": "GET"},
        )
        assert response.status_code == 401
