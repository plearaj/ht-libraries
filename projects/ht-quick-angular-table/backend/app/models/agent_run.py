from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AgentColumnInfo(BaseModel):
    """Describes a column in the data being sent to the agent."""

    model_config = ConfigDict(populate_by_name=True)

    name: str
    data_name: str = Field(alias="dataName")
    data_type: str = Field(alias="dataType")


class AgentRunRequest(BaseModel):
    """Request body for POST /agent/run."""

    model_config = ConfigDict(populate_by_name=True)

    task: str = Field(max_length=2000)
    rows: list[dict[str, Any]] = Field(default_factory=list)
    columns: list[AgentColumnInfo] = Field(default_factory=list)
    context: dict[str, Any] | None = None

    @field_validator("rows")
    @classmethod
    def _cap_rows(cls, v: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if len(v) > 500:
            raise ValueError("rows must not exceed 500 entries")
        return v


class AgentActionResult(BaseModel):
    """Result of a single action executed by the agent."""

    model_config = ConfigDict(populate_by_name=True)

    action_name: str = Field(alias="actionName")
    row_index: int | None = Field(default=None, alias="rowIndex")
    result: Any = None
    status: Literal["success", "error"]
    reason: str | None = None


class AgentRunResponse(BaseModel):
    """Response body for POST /agent/run."""

    model_config = ConfigDict(populate_by_name=True)

    actions: list[AgentActionResult] = Field(default_factory=list)
    summary: str
    duration_ms: float = Field(alias="durationMs")
