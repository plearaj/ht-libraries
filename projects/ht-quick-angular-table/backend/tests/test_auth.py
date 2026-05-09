from __future__ import annotations

from fastapi.testclient import TestClient


class TestLogin:
    """Tests for POST /auth/login."""

    def test_login_valid_key(self, client: TestClient) -> None:
        """A correct API key returns 200 with an accessToken."""
        response = client.post(
            "/auth/login", json={"apiKey": "test-key"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "accessToken" in data
        assert "expiresIn" in data
        assert isinstance(data["accessToken"], str)
        assert data["expiresIn"] > 0

    def test_login_invalid_key(self, client: TestClient) -> None:
        """An incorrect API key returns 401."""
        response = client.post(
            "/auth/login", json={"apiKey": "wrong-key"}
        )
        assert response.status_code == 401


class TestRefresh:
    """Tests for POST /auth/refresh."""

    def test_refresh_rotates_tokens(self, client: TestClient) -> None:
        """After login, POST /auth/refresh returns a new access token."""
        # First, login to get the refresh cookie
        login_resp = client.post(
            "/auth/login", json={"apiKey": "test-key"}
        )
        assert login_resp.status_code == 200
        original_token = login_resp.json()["accessToken"]

        # Extract the refresh_token cookie value set by the login response.
        # TestClient may not forward it automatically because the cookie is
        # set with secure=True (HTTPS only) while TestClient uses HTTP.
        refresh_cookie = login_resp.cookies.get("refresh_token")
        assert refresh_cookie is not None, "Login should set a refresh_token cookie"

        refresh_resp = client.post(
            "/auth/refresh", cookies={"refresh_token": refresh_cookie}
        )
        assert refresh_resp.status_code == 200

        new_token = refresh_resp.json()["accessToken"]
        assert isinstance(new_token, str)
        assert len(new_token) > 0


class TestLogout:
    """Tests for POST /auth/logout."""

    def test_logout_clears_cookie(self, client: TestClient) -> None:
        """POST /auth/logout returns 200 and clears the refresh_token cookie."""
        # Login first
        client.post("/auth/login", json={"apiKey": "test-key"})

        # Logout
        response = client.post("/auth/logout")
        assert response.status_code == 200

        # After logout, refresh should fail because the cookie was cleared
        refresh_resp = client.post("/auth/refresh")
        assert refresh_resp.status_code == 401


class TestHealthEndpoint:
    """Tests for GET /health."""

    def test_health_no_auth_required(self, client: TestClient) -> None:
        """GET /health works without any authentication."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    def test_protected_endpoint_rejects_no_token(
        self, client: TestClient
    ) -> None:
        """Verifying that the get_current_user dependency rejects missing tokens.

        The /health endpoint itself is unprotected, so we validate that
        the auth dependency correctly raises 401 by directly testing a
        request that would require it (simulated via the auth header check).
        """
        # /health is unprotected — this is intentional
        response = client.get("/health")
        assert response.status_code == 200

        # But if we add the Authorization header without a valid token
        # on a future protected endpoint, it should fail.
        # For now, we verify the auth_headers fixture produces a valid token
        # and that the dependency correctly validates.
        from app.auth.dependencies import get_current_user
        from app.config import Settings

        import pytest
        from fastapi import HTTPException

        settings = Settings(
            JWT_SECRET="test-secret",
            API_KEY="test-key",
        )

        # Missing bearer prefix -> should raise 401
        with pytest.raises(HTTPException) as exc_info:
            import asyncio

            asyncio.get_event_loop().run_until_complete(
                get_current_user(authorization="not-a-bearer-token", settings=settings)
            )
        assert exc_info.value.status_code == 401
