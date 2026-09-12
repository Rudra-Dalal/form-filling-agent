import json
import re
from pathlib import Path
from typing import List, Tuple, Optional

from ..config import has_llm_key, DEFAULT_MODEL
from ..schemas.document import ExtractedField, DocumentData
from .parsers import parse_docx, parse_pdf, parse_xlsx
from .normalizer import normalize_document_fields

EXTRACTION_SYSTEM_PROMPT = """You extract structured personal/administrative information from a school
document's raw text (admission forms, ID pages, etc).

Return ONLY valid JSON, no prose, no markdown fences, matching this shape:
{
  "fields": [
    { "label": "Student Full Name", "value": "Aditi Sharma", "confidence": "high" },
    { "label": "Date of Birth", "value": "2015-03-12", "confidence": "high" }
  ],
  "warnings": [
    "Parent's occupation not found in the document",
    "Two different addresses appear - permanent and correspondence - unclear which to use"
  ]
}

Rules:
- Only include a field if the text actually supports it. Never invent values.
- confidence is "high" only when the value is stated unambiguously and once.
- If a value is missing, unclear, or conflicting, do NOT guess - omit it from
  "fields" and describe the issue in "warnings" instead.
- Dates: normalize to ISO (YYYY-MM-DD) when the source format is unambiguous;
  otherwise leave as found in the text and add a warning."""

def read_raw_text(file_path: str | Path) -> str:
    path = Path(file_path)
    ext = path.suffix.lower()

    if ext == ".docx":
        return parse_docx(path)
    elif ext == ".pdf":
        return parse_pdf(path)
    elif ext in (".xlsx", ".xls"):
        return parse_xlsx(path)
    else:
        raise ValueError(f"Unsupported document format: {ext}")

def extract_structured_fields_heuristic(raw_text: str) -> Tuple[List[ExtractedField], List[str]]:
    fields: List[ExtractedField] = []
    warnings: List[str] = []
    text = raw_text or ""

    def find_match(pattern: str) -> Optional[str]:
        m = re.search(pattern, text, re.IGNORECASE)
        return m.group(1).strip() if m else None

    # Student details
    name = find_match(r'(?:Student Name|Full Name|Candidate Name|Applicant Name):\s*([^\r\n]+)')
    if name:
        fields.append(ExtractedField(label="Student Full Name", value=name, confidence="high"))

    dob = find_match(r'(?:DOB|Date of Birth|Birth Date):\s*([^\r\n]+)')
    if dob:
        fields.append(ExtractedField(label="Date of Birth", value=dob, confidence="high"))

    gender = find_match(r'(?:Sex|Gender):\s*([^\r\n]+)')
    if gender:
        fields.append(ExtractedField(label="Gender", value=gender, confidence="high"))

    # Parent details
    father = find_match(r"(?:Father's Name|Father Name):\s*([^\r\n]+)")
    if father:
        fields.append(ExtractedField(label="Father's Name", value=father, confidence="high"))

    mother = find_match(r"(?:Mother's Name|Mother Name):\s*([^\r\n]+)")
    if mother:
        fields.append(ExtractedField(label="Mother's Name", value=mother, confidence="high"))

    phone = find_match(r'(?:Contact Number|Phone Number|Mobile Number|Contact No|Mobile):\s*([^\r\n]+)')
    if phone:
        fields.append(ExtractedField(label="Contact Number", value=phone, confidence="high"))

    # Grade
    grade_match = (
        find_match(r'Applying for admission to Grade\s*(\d+)') or
        find_match(r'Applying for Grade:\s*([^\r\n]+)') or
        find_match(r'(?:Grade|Class):\s*([^\r\n]+)')
    )
    if grade_match:
        grade_val = grade_match if grade_match.lower().startswith("grade") else f"Grade {grade_match}"
        fields.append(ExtractedField(label="Applying for Grade", value=grade_val, confidence="high"))

    # Addresses & Ambiguity
    perm_address = find_match(r'Permanent Address:\s*([^\r\n]+)')
    corr_address = find_match(r'Correspondence Address:\s*([^\r\n]+)')
    single_address = find_match(r'(?:Residential Address|Address):\s*([^\r\n]+)')

    if perm_address and corr_address:
        warnings.append(
            f'Two different addresses appear in document (permanent: "{perm_address}" vs correspondence: "{corr_address}") - residential address is ambiguous'
        )
        fields.append(ExtractedField(label="Permanent Address", value=perm_address, confidence="high"))
        fields.append(ExtractedField(label="Correspondence Address", value=corr_address, confidence="high"))

        parts = [s.strip() for s in perm_address.split(',')]
        if len(parts) >= 4:
            fields.append(ExtractedField(label="Residential Address", value=parts[0], confidence="medium"))
            fields.append(ExtractedField(label="City", value=parts[1], confidence="high"))
            fields.append(ExtractedField(label="State", value=parts[2], confidence="high"))
            fields.append(ExtractedField(label="PIN Code", value=parts[3], confidence="high"))
        else:
            fields.append(ExtractedField(label="Residential Address", value=perm_address, confidence="medium"))
    elif single_address:
        parts = [s.strip() for s in single_address.split(',')]
        if len(parts) >= 4:
            fields.append(ExtractedField(label="Residential Address", value=parts[0], confidence="high"))
            fields.append(ExtractedField(label="City", value=parts[1], confidence="high"))
            fields.append(ExtractedField(label="State", value=parts[2], confidence="high"))
            fields.append(ExtractedField(label="PIN Code", value=parts[3], confidence="high"))
        else:
            fields.append(ExtractedField(label="Residential Address", value=single_address, confidence="high"))

    return fields, warnings

def extract_structured_fields_llm(raw_text: str) -> Tuple[List[ExtractedField], List[str]]:
    import anthropic
    import os
    key = os.getenv("ANTHROPIC_API_KEY", "")
    client = anthropic.Anthropic(api_key=key)

    response = client.messages.create(
        model=DEFAULT_MODEL,
        max_tokens=2000,
        system=EXTRACTION_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": raw_text[:8000]}],
    )

    text_resp = response.content[0].text.strip()
    # Clean possible markdown fences
    cleaned = re.sub(r'^```(?:json)?\s*', '', text_resp)
    cleaned = re.sub(r'\s*```$', '', cleaned)
    data = json.loads(cleaned)

    fields = [ExtractedField(**f) for f in data.get("fields", [])]
    warnings = data.get("warnings", [])
    return fields, warnings

def extract_document(file_path: str | Path, dry_run: bool = False) -> DocumentData:
    raw_text = read_raw_text(file_path)
    fields: List[ExtractedField] = []
    warnings: List[str] = []

    if not dry_run and has_llm_key():
        try:
            fields, warnings = extract_structured_fields_llm(raw_text)
        except Exception:
            # Fallback seamlessly to heuristic extractor
            fields, warnings = extract_structured_fields_heuristic(raw_text)
    else:
        fields, warnings = extract_structured_fields_heuristic(raw_text)

    return normalize_document_fields(fields, warnings=warnings, raw_text=raw_text)
