from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.auth import jwt_service
from app.config import Settings, get_settings
from app.main import app


@pytest.fixture()
def mock_settings() -> Settings:
    """Return a Settings instance with deterministic test values."""
    return Settings(
        JWT_SECRET="test-secret",
        JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15,
        JWT_REFRESH_TOKEN_EXPIRE_DAYS=30,
        API_KEY="test-key",
        LITELLM_MODEL="anthropic/claude-sonnet-4-20250514",
        CORS_ORIGINS="http://localhost:4200",
    )


@pytest.fixture()
def client(mock_settings: Settings) -> TestClient:
    """Return a FastAPI TestClient wired to use test settings."""

    def _override_settings() -> Settings:
        return mock_settings

    app.dependency_overrides[get_settings] = _override_settings
    yield TestClient(app)  # type: ignore[misc]
    app.dependency_overrides.clear()


@pytest.fixture()
def auth_token(mock_settings: Settings) -> str:
    """Return a valid JWT access token for testing."""
    return jwt_service.create_access_token("api-user", mock_settings)


@pytest.fixture()
def auth_headers(auth_token: str) -> dict[str, str]:
    """Return an Authorization header dict with a valid Bearer token."""
    return {"Authorization": f"Bearer {auth_token}"}
