from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.auth.dependencies import get_current_user
from app.models.data_result import DataResult
from app.models.skill_config import (
    ApiPullRequest,
    DatabaseQueryRequest,
    DatabaseTestRequest,
    DatabaseTestResponse,
)
from app.skills import excel_service

router = APIRouter(prefix="/skills", tags=["Skills"], dependencies=[Depends(get_current_user)])

# Maximum upload size in bytes (10 MB default)
MAX_UPLOAD_SIZE = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {".xlsx", ".xls", ".csv"}


def _validate_file(file: UploadFile) -> str:
    """Validate uploaded file extension. Returns the extension."""
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No filename provided")
    ext = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file format. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )
    return ext


@router.post("/excel/upload", response_model=DataResult)
async def upload_excel(
    file: UploadFile = File(...),
    sheet: str | None = Form(default=None),
) -> DataResult:
    """Upload an Excel/CSV file and return parsed data."""
    _validate_file(file)
    contents = await file.read()
    if len(contents) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size: {MAX_UPLOAD_SIZE // (1024 * 1024)} MB",
        )
    try:
        return excel_service.parse_excel(contents, file.filename or "upload.xlsx", sheet)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/excel/sheets")
async def list_sheets(file: UploadFile = File(...)) -> dict[str, list[str]]:
    """List sheet names in an uploaded Excel file."""
    _validate_file(file)
    contents = await file.read()
    sheets = excel_service.list_sheets(contents, file.filename or "upload.xlsx")
    return {"sheets": sheets}


# --- API Pull ---


@router.post("/api/pull", response_model=DataResult)
async def pull_api_data(body: ApiPullRequest) -> DataResult:
    """Pull data from an external API."""
    from app.skills.api_pull_service import pull_api_data as _pull

    try:
        return await _pull(body)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except ConnectionError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    except TimeoutError as exc:
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail=str(exc)) from exc


# --- Database ---


@router.post("/database/query", response_model=DataResult)
async def query_database(body: DatabaseQueryRequest) -> DataResult:
    """Execute a read-only SQL query and return results."""
    from app.skills.database_service import query_database as _query
    from app.skills.query_validator import validate_readonly_query

    if not validate_readonly_query(body.query):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only SELECT queries are allowed",
        )
    try:
        return await _query(body)
    except ConnectionError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    except TimeoutError as exc:
        raise HTTPException(status_code=status.HTTP_408_REQUEST_TIMEOUT, detail=str(exc)) from exc


@router.post("/database/test", response_model=DatabaseTestResponse)
async def test_database(body: DatabaseTestRequest) -> DatabaseTestResponse:
    """Test database connectivity."""
    from app.skills.database_service import test_connection

    try:
        return await test_connection(body.db_type, body.connection_string)
    except ConnectionError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
