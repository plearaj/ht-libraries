from __future__ import annotations

import json
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

# ---------------------------------------------------------------------------
# Sample LLM responses
# ---------------------------------------------------------------------------
VALID_TABLE_JSON = json.dumps(
    {
        "tableName": "employeeTable",
        "noRecordMessage": "No employees found.",
        "columns": [
            {
                "columnHeader": "Name",
                "columnDataName": "name",
                "columnDataType": "string",
                "sortable": True,
                "filterable": True,
            },
            {
                "columnHeader": "Age",
                "columnDataName": "age",
                "columnDataType": "number",
                "sortable": True,
                "filterable": False,
            },
        ],
        "filter": {"showFilter": True, "filterType": "simple"},
        "paginator": {
            "showPagination": True,
            "pageSize": 10,
            "pageSizeOptions": [5, 10, 25],
        },
    }
)

CLARIFICATION_TEXT = "Could you clarify what columns you need in the table?"


def _mock_completion(content: str) -> AsyncMock:
    """Build an ``AsyncMock`` that mimics a LiteLLM ``acompletion`` response."""
    mock_message = AsyncMock()
    mock_message.content = content

    mock_choice = AsyncMock()
    mock_choice.message = mock_message

    mock_response = AsyncMock()
    mock_response.choices = [mock_choice]
    return mock_response


# ---------------------------------------------------------------------------
# T024-1: describe returns valid table JSON when LLM responds with JSON
# ---------------------------------------------------------------------------
def test_describe_returns_table_settings(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    with patch(
        "app.agent.llm_service.litellm.acompletion",
        return_value=_mock_completion(VALID_TABLE_JSON),
    ):
        response = client.post(
            "/agent/describe",
            json={"message": "Create an employee table with name and age"},
            headers=auth_headers,
        )

    assert response.status_code == 200
    data = response.json()
    assert data["tableSettings"] is not None
    assert data["tableSettings"]["tableName"] == "employeeTable"
    assert len(data["tableSettings"]["columns"]) == 2
    assert data["clarification"] is None


# ---------------------------------------------------------------------------
# T024-2: describe returns clarification when LLM responds with a question
# ---------------------------------------------------------------------------
def test_describe_returns_clarification(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    with patch(
        "app.agent.llm_service.litellm.acompletion",
        return_value=_mock_completion(CLARIFICATION_TEXT),
    ):
        response = client.post(
            "/agent/describe",
            json={"message": "I need a table"},
            headers=auth_headers,
        )

    assert response.status_code == 200
    data = response.json()
    assert data["tableSettings"] is None
    assert data["clarification"] == CLARIFICATION_TEXT


# ---------------------------------------------------------------------------
# T024-3: refine updates existing config (sends currentConfig in prompt)
# ---------------------------------------------------------------------------
def test_refine_sends_current_config(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    current_config = json.loads(VALID_TABLE_JSON)

    with patch(
        "app.agent.llm_service.litellm.acompletion",
        return_value=_mock_completion(VALID_TABLE_JSON),
    ) as mock_acompletion:
        response = client.post(
            "/agent/refine",
            json={
                "message": "Add an email column",
                "currentConfig": current_config,
            },
            headers=auth_headers,
        )

    assert response.status_code == 200
    data = response.json()
    assert data["tableSettings"] is not None

    # Verify the current config was included in the prompt sent to the LLM
    call_args = mock_acompletion.call_args
    messages = call_args.kwargs.get("messages") or call_args[1].get("messages")
    user_message = messages[-1]["content"]
    assert "Current table configuration:" in user_message
    assert "employeeTable" in user_message
    assert "Requested change: Add an email column" in user_message


# ---------------------------------------------------------------------------
# T024-4: unauthenticated request returns 401
# ---------------------------------------------------------------------------
def test_describe_unauthenticated(client: TestClient) -> None:
    response = client.post(
        "/agent/describe",
        json={"message": "Create a table"},
    )
    assert response.status_code in (401, 422)


def test_refine_unauthenticated(client: TestClient) -> None:
    response = client.post(
        "/agent/refine",
        json={
            "message": "Add a column",
            "currentConfig": {"tableName": "test"},
        },
    )
    assert response.status_code in (401, 422)
