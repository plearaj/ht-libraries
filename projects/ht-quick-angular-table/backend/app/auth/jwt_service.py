from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt

from app.config import Settings


def create_access_token(subject: str, settings: Settings) -> str:
    """Create a short-lived HS256 access token."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


def create_refresh_token(subject: str, settings: Settings) -> str:
    """Create a long-lived HS256 refresh token."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "type": "refresh",
        "iat": now,
        "exp": now + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


def verify_token(token: str, expected_type: str, settings: Settings) -> dict:
    """Decode and verify a JWT token.

    Raises ``ValueError`` when the token is invalid, expired, or has an
    unexpected type.
    """
    try:
        payload: dict = jwt.decode(
            token, settings.JWT_SECRET, algorithms=["HS256"]
        )
    except jwt.ExpiredSignatureError as exc:
        raise ValueError("Token has expired") from exc
    except jwt.InvalidTokenError as exc:
        raise ValueError("Invalid token") from exc

    if payload.get("type") != expected_type:
        raise ValueError(
            f"Expected token type '{expected_type}', got '{payload.get('type')}'"
        )

    return payload
