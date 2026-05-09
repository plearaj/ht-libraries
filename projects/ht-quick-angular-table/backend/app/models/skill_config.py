from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ChatMessage(BaseModel):
    """A single message in a conversation session history."""

    role: Literal["user", "assistant"]
    content: str


class ApiPullRequest(BaseModel):
    """Configuration for the API-pull data skill."""

    model_config = ConfigDict(populate_by_name=True)

    url: str
    method: Literal["GET", "POST"] = "GET"
    headers: dict[str, str] | None = None
    body: Any = None
    json_path: str | None = Field(default=None, alias="jsonPath")

    @model_validator(mode="after")
    def _body_only_with_post(self) -> ApiPullRequest:
        if self.body is not None and self.method != "POST":
            raise ValueError("body is only allowed when method is POST")
        return self


class DatabaseQueryRequest(BaseModel):
    """Configuration for the database-query data skill."""

    model_config = ConfigDict(populate_by_name=True)

    db_type: Literal["postgresql", "mysql", "sqlite"] = Field(alias="dbType")
    connection_string: str = Field(alias="connectionString")
    query: str
    row_limit: int = Field(default=10000, alias="rowLimit")
    timeout_seconds: int = Field(default=30, alias="timeoutSeconds")

    @model_validator(mode="after")
    def _validate_limits(self) -> DatabaseQueryRequest:
        if self.row_limit > 100000:
            raise ValueError("rowLimit must not exceed 100000")
        if self.timeout_seconds > 300:
            raise ValueError("timeoutSeconds must not exceed 300")
        return self


class DescribeRequest(BaseModel):
    """Request body for the /builder/describe endpoint."""

    model_config = ConfigDict(populate_by_name=True)

    message: str = Field(max_length=2000)
    session_history: list[ChatMessage] | None = Field(
        default=None, alias="sessionHistory"
    )


class RefineRequest(BaseModel):
    """Request body for the /builder/refine endpoint."""

    model_config = ConfigDict(populate_by_name=True)

    message: str
    current_config: dict[str, Any] = Field(alias="currentConfig")
    session_history: list[ChatMessage] | None = Field(
        default=None, alias="sessionHistory"
    )


class DatabaseTestRequest(BaseModel):
    """Request body for testing database connectivity."""

    model_config = ConfigDict(populate_by_name=True)

    db_type: Literal["postgresql", "mysql", "sqlite"] = Field(alias="dbType")
    connection_string: str = Field(alias="connectionString")


class DatabaseTestResponse(BaseModel):
    """Response body for database connectivity test."""

    model_config = ConfigDict(populate_by_name=True)

    connected: bool
    server_version: str = Field(alias="serverVersion")


class BuilderResponse(BaseModel):
    """Response body for /builder/describe and /builder/refine."""

    model_config = ConfigDict(populate_by_name=True)

    table_settings: dict[str, Any] | None = Field(
        default=None, alias="tableSettings"
    )
    clarification: str | None = None
