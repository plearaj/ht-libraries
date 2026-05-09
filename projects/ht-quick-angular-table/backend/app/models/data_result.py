from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ColumnDefinition(BaseModel):
    """Describes a single column in a data result."""

    model_config = ConfigDict(populate_by_name=True)

    name: str
    data_name: str = Field(alias="dataName")
    data_type: Literal["string", "number", "date", "boolean"] = Field(alias="dataType")


class ResultMetadata(BaseModel):
    """Optional metadata about the origin of a data result."""

    model_config = ConfigDict(populate_by_name=True)

    source: Literal["excel", "api", "database"]
    sheet_name: str | None = Field(default=None, alias="sheetName")
    sheet_names: list[str] | None = Field(default=None, alias="sheetNames")
    api_status_code: int | None = Field(default=None, alias="apiStatusCode")
    query_execution_ms: float | None = Field(default=None, alias="queryExecutionMs")


class DataResult(BaseModel):
    """Unified result envelope returned by every data-skill endpoint."""

    model_config = ConfigDict(populate_by_name=True)

    columns: list[ColumnDefinition]
    rows: list[dict[str, Any]]
    total_rows: int = Field(alias="totalRows")
    truncated: bool
    metadata: ResultMetadata | None = None

    @model_validator(mode="after")
    def _columns_not_empty(self) -> DataResult:
        if len(self.columns) < 1:
            raise ValueError("columns must have at least one entry")
        return self


class ErrorResponse(BaseModel):
    """Standard error envelope."""

    code: str
    message: str
    details: Any = None
