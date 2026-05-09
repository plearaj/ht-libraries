from __future__ import annotations

from typing import Any

import httpx
from jsonpath_ng import parse as jsonpath_parse

from app.models.data_result import ColumnDefinition, DataResult, ResultMetadata
from app.models.skill_config import ApiPullRequest


def _infer_type(value: Any) -> str:
    """Infer column data type from a Python value."""
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, (int, float)):
        return "number"
    return "string"


def _rows_to_data_result(rows: list[dict[str, Any]], status_code: int) -> DataResult:
    """Convert raw row dicts into a DataResult with inferred columns."""
    if not rows:
        return DataResult(
            columns=[ColumnDefinition(name="empty", data_name="empty", data_type="string")],
            rows=[],
            total_rows=0,
            truncated=False,
            metadata=ResultMetadata(source="api", api_status_code=status_code),
        )

    # Infer columns from first row
    first = rows[0]
    columns = [
        ColumnDefinition(
            name=str(key),
            data_name=str(key),
            data_type=_infer_type(val),
        )
        for key, val in first.items()
        if not isinstance(val, (dict, list))  # Skip nested objects
    ]

    # Filter rows to only include flat values
    flat_keys = {c.data_name for c in columns}
    clean_rows = [{k: v for k, v in row.items() if k in flat_keys} for row in rows]

    return DataResult(
        columns=columns,
        rows=clean_rows,
        total_rows=len(clean_rows),
        truncated=False,
        metadata=ResultMetadata(source="api", api_status_code=status_code),
    )


async def pull_api_data(config: ApiPullRequest) -> DataResult:
    """Pull data from an external API and return a DataResult."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            if config.method == "GET":
                response = await client.get(config.url, headers=config.headers)
            else:
                response = await client.post(
                    config.url, headers=config.headers, json=config.body
                )
    except httpx.ConnectError as exc:
        raise ConnectionError(f"Cannot connect to {config.url}") from exc
    except httpx.TimeoutException as exc:
        raise TimeoutError(f"Request to {config.url} timed out") from exc

    if response.status_code >= 400:
        raise ConnectionError(
            f"API returned status {response.status_code}: {response.text[:500]}"
        )

    try:
        data = response.json()
    except Exception as exc:
        raise ValueError("Response is not valid JSON") from exc

    # Apply JSONPath if provided
    if config.json_path:
        expr = jsonpath_parse(config.json_path)
        matches = [match.value for match in expr.find(data)]
        if matches and isinstance(matches[0], list):
            data = matches[0]
        else:
            data = matches

    # Normalize to list of dicts
    if isinstance(data, dict):
        data = [data]
    if not isinstance(data, list):
        raise ValueError("Extracted data is not a list of objects")

    # Ensure each item is a dict
    rows = [item for item in data if isinstance(item, dict)]

    return _rows_to_data_result(rows, response.status_code)
