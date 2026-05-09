from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    """Request body for POST /auth/login."""

    model_config = ConfigDict(populate_by_name=True)

    api_key: str = Field(alias="apiKey")


class LoginResponse(BaseModel):
    """Response body for POST /auth/login and POST /auth/refresh."""

    model_config = ConfigDict(populate_by_name=True)

    access_token: str = Field(alias="accessToken")
    expires_in: int = Field(alias="expiresIn")
