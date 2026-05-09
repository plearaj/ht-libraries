from __future__ import annotations

import io
from typing import Any

import pandas as pd

from app.models.data_result import ColumnDefinition, DataResult, ResultMetadata


def _infer_column_type(series: pd.Series) -> str:
    """Infer the column data type from a pandas Series."""
    if pd.api.types.is_bool_dtype(series):
        return "boolean"
    if pd.api.types.is_numeric_dtype(series):
        return "number"
    if pd.api.types.is_datetime64_any_dtype(series):
        return "date"
    return "string"


def _dataframe_to_data_result(
    df: pd.DataFrame,
    source: str = "excel",
    sheet_name: str | None = None,
    sheet_names: list[str] | None = None,
    row_limit: int = 10000,
) -> DataResult:
    """Convert a pandas DataFrame into a DataResult."""
    truncated = len(df) > row_limit
    if truncated:
        df = df.head(row_limit)

    columns = []
    for col in df.columns:
        col_str = str(col)
        # Create a safe data name
        data_name = col_str.replace(" ", "_").replace("-", "_")
        columns.append(
            ColumnDefinition(
                name=col_str,
                data_name=data_name,
                data_type=_infer_column_type(df[col]),
            )
        )

    # Convert rows: replace NaN with None for JSON serialization
    rows: list[dict[str, Any]] = []
    for _, row in df.iterrows():
        row_dict: dict[str, Any] = {}
        for col_def in columns:
            val = row.get(col_def.name)
            if pd.isna(val):
                row_dict[col_def.data_name] = None
            else:
                # Convert numpy types to Python native
                row_dict[col_def.data_name] = val.item() if hasattr(val, "item") else val
            # Handle Timestamp -> ISO string
            if isinstance(row_dict[col_def.data_name], pd.Timestamp):
                row_dict[col_def.data_name] = row_dict[col_def.data_name].isoformat()
        rows.append(row_dict)

    metadata = ResultMetadata(source=source)
    if sheet_name:
        metadata.sheet_name = sheet_name
    if sheet_names:
        metadata.sheet_names = sheet_names

    return DataResult(
        columns=columns,
        rows=rows,
        total_rows=len(df) if not truncated else len(df),
        truncated=truncated,
        metadata=metadata,
    )


def list_sheets(file_bytes: bytes, filename: str) -> list[str]:
    """List sheet names in an Excel workbook."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext == "csv":
        return ["Sheet1"]

    buf = io.BytesIO(file_bytes)
    xls = pd.ExcelFile(buf, engine="openpyxl" if ext == "xlsx" else "xlrd")
    return xls.sheet_names


def parse_excel(
    file_bytes: bytes,
    filename: str,
    sheet_name: str | None = None,
    row_limit: int = 10000,
) -> DataResult:
    """Parse an Excel/CSV file into a DataResult."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    buf = io.BytesIO(file_bytes)

    sheet_names: list[str] | None = None

    if ext == "csv":
        df = pd.read_csv(buf)
        actual_sheet = "Sheet1"
    elif ext in ("xlsx", "xls"):
        engine = "openpyxl" if ext == "xlsx" else "xlrd"
        xls = pd.ExcelFile(buf, engine=engine)
        sheet_names = xls.sheet_names
        actual_sheet = sheet_name if sheet_name and sheet_name in sheet_names else sheet_names[0]
        df = pd.read_excel(xls, sheet_name=actual_sheet)
    else:
        raise ValueError(f"Unsupported file format: .{ext}")

    return _dataframe_to_data_result(
        df,
        source="excel",
        sheet_name=actual_sheet,
        sheet_names=sheet_names,
        row_limit=row_limit,
    )
