from __future__ import annotations

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status

from app.auth import jwt_service
from app.config import Settings, get_settings
from app.models.auth import LoginRequest, LoginResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


def _set_refresh_cookie(response: Response, token: str) -> None:
    """Set the refresh token as an HttpOnly cookie."""
    response.set_cookie(
        key="refresh_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="strict",
        path="/auth",
    )


@router.post("/login", response_model=LoginResponse)
async def login(
    body: LoginRequest,
    response: Response,
    settings: Settings = Depends(get_settings),
) -> LoginResponse:
    """Authenticate with an API key and receive a JWT token pair."""
    if body.api_key != settings.API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )

    subject = "api-user"
    access_token = jwt_service.create_access_token(subject, settings)
    refresh_token = jwt_service.create_refresh_token(subject, settings)

    _set_refresh_cookie(response, refresh_token)

    return LoginResponse(
        access_token=access_token,
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/refresh", response_model=LoginResponse)
async def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    settings: Settings = Depends(get_settings),
) -> LoginResponse:
    """Rotate the refresh token and issue a new access token."""
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing refresh token cookie",
        )

    try:
        payload = jwt_service.verify_token(refresh_token, "refresh", settings)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc

    subject: str = payload["sub"]
    new_access = jwt_service.create_access_token(subject, settings)
    new_refresh = jwt_service.create_refresh_token(subject, settings)

    _set_refresh_cookie(response, new_refresh)

    return LoginResponse(
        access_token=new_access,
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(response: Response) -> dict[str, str]:
    """Clear the refresh token cookie."""
    response.delete_cookie(
        key="refresh_token",
        path="/auth",
        httponly=True,
        secure=True,
        samesite="strict",
    )
    return {"message": "Logged out"}
