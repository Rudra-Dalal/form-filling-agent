from pathlib import Path
import pypdf

def parse_pdf(file_path: str | Path) -> str:
    """Extract raw text from a PDF file using pypdf."""
    reader = pypdf.PdfReader(str(file_path))
    pages_text: list[str] = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages_text.append(text)
    return "\n".join(pages_text)
