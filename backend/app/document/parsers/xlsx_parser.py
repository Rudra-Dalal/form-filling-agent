from pathlib import Path
import openpyxl

def parse_xlsx(file_path: str | Path) -> str:
    """Extract raw text from an Excel spreadsheet (.xlsx/.xls) using openpyxl."""
    wb = openpyxl.load_workbook(str(file_path), data_only=True)
    lines: list[str] = []
    for sheet in wb.worksheets:
        for row in sheet.iter_rows(values_only=True):
            vals = [str(cell).strip() for cell in row if cell is not None and str(cell).strip()]
            if vals:
                lines.append(" : ".join(vals))
    return "\n".join(lines)
