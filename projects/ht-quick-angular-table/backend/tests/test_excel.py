from __future__ import annotations

import io

import pandas as pd
import pytest
from fastapi.testclient import TestClient


def _make_xlsx(data: dict, sheet_name: str = "Sheet1") -> bytes:
    """Create an in-memory .xlsx file from a dict of column->values."""
    buf = io.BytesIO()
    df = pd.DataFrame(data)
    df.to_excel(buf, sheet_name=sheet_name, index=False, engine="openpyxl")
    buf.seek(0)
    return buf.read()


def _make_csv(data: dict) -> bytes:
    """Create an in-memory CSV from a dict of column->values."""
    df = pd.DataFrame(data)
    return df.to_csv(index=False).encode()


class TestExcelUpload:
    """Tests for POST /skills/excel/upload."""

    def test_parse_xlsx(self, client: TestClient, auth_headers: dict) -> None:
        data = {"Name": ["Alice", "Bob"], "Age": [30, 25]}
        content = _make_xlsx(data)
        response = client.post(
            "/skills/excel/upload",
            files={"file": ("test.xlsx", content, "application/octet-stream")},
            headers=auth_headers,
        )
        assert response.status_code == 200
        result = response.json()
        assert len(result["columns"]) == 2
        assert len(result["rows"]) == 2
        assert result["rows"][0]["Name"] == "Alice"

    def test_parse_csv(self, client: TestClient, auth_headers: dict) -> None:
        data = {"City": ["NYC", "LA"], "Pop": [8000000, 4000000]}
        content = _make_csv(data)
        response = client.post(
            "/skills/excel/upload",
            files={"file": ("data.csv", content, "text/csv")},
            headers=auth_headers,
        )
        assert response.status_code == 200
        result = response.json()
        assert len(result["columns"]) == 2
        assert result["rows"][0]["City"] == "NYC"

    def test_empty_file_returns_columns(self, client: TestClient, auth_headers: dict) -> None:
        data = {"Col1": [], "Col2": []}
        content = _make_xlsx(data)
        response = client.post(
            "/skills/excel/upload",
            files={"file": ("empty.xlsx", content, "application/octet-stream")},
            headers=auth_headers,
        )
        assert response.status_code == 200
        result = response.json()
        assert len(result["columns"]) == 2
        assert len(result["rows"]) == 0

    def test_invalid_format_returns_400(self, client: TestClient, auth_headers: dict) -> None:
        response = client.post(
            "/skills/excel/upload",
            files={"file": ("test.txt", b"hello", "text/plain")},
            headers=auth_headers,
        )
        assert response.status_code == 400

    def test_oversized_file_returns_413(self, client: TestClient, auth_headers: dict) -> None:
        # Create a file larger than 10MB
        import app.skills.router as skills_router

        original = skills_router.MAX_UPLOAD_SIZE
        skills_router.MAX_UPLOAD_SIZE = 100  # 100 bytes for testing
        try:
            content = b"x" * 200  # Exceeds 100 byte limit
            # Use CSV since it's the simplest valid format for extension check
            response = client.post(
                "/skills/excel/upload",
                files={"file": ("big.csv", content, "text/csv")},
                headers=auth_headers,
            )
            assert response.status_code == 413
        finally:
            skills_router.MAX_UPLOAD_SIZE = original

    def test_unauthenticated_rejected(self, client: TestClient) -> None:
        response = client.post(
            "/skills/excel/upload",
            files={"file": ("test.xlsx", b"content", "application/octet-stream")},
        )
        assert response.status_code in (401, 422)


class TestExcelSheets:
    """Tests for POST /skills/excel/sheets."""

    def test_list_sheets(self, client: TestClient, auth_headers: dict) -> None:
        buf = io.BytesIO()
        with pd.ExcelWriter(buf, engine="openpyxl") as writer:
            pd.DataFrame({"A": [1]}).to_excel(writer, sheet_name="First", index=False)
            pd.DataFrame({"B": [2]}).to_excel(writer, sheet_name="Second", index=False)
        buf.seek(0)
        response = client.post(
            "/skills/excel/sheets",
            files={"file": ("multi.xlsx", buf.read(), "application/octet-stream")},
            headers=auth_headers,
        )
        assert response.status_code == 200
        sheets = response.json()["sheets"]
        assert "First" in sheets
        assert "Second" in sheets
