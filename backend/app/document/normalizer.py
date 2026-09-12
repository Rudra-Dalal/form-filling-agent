import re
from typing import List, Tuple, Optional, Any, Dict
from ..schemas.document import (
    CanonicalRecord,
    ExtractedField,
    UnmappedField,
    DocumentData,
    StudentInfo,
    ParentInfo,
    AddressInfo,
)
from .schemas import empty_canonical_record

LABEL_RULES: List[Tuple[str, List[str]]] = [
    ('student.fullName', ['student name', "student's name", 'applicant name', 'full name', 'candidate name']),
    ('student.dateOfBirth', ['date of birth', 'dob', 'birth date']),
    ('student.gender', ['gender', 'sex']),
    ('parent.fatherName', ["father's name", 'father name', 'guardian name (father)']),
    ('parent.motherName', ["mother's name", 'mother name', 'guardian name (mother)']),
    ('parent.contactNumber', ['contact number', 'phone number', 'mobile number', 'contact no']),
    ('address.pincode', ['pincode', 'pin code', 'zip code', 'postal code']),
    ('address.state', ['state']),
    ('address.city', ['city', 'town', 'district']),
    ('address.street', ['address', 'street', 'residential address']),
]

def normalize_date_value(val: Optional[str]) -> Optional[str]:
    if not val or not isinstance(val, str):
        return val
    trimmed = val.strip()
    # Already ISO YYYY-MM-DD
    if re.match(r'^\d{4}-\d{2}-\d{2}$', trimmed):
        return trimmed
    # DD/MM/YYYY or DD-MM-YYYY
    dmy_match = re.match(r'^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$', trimmed)
    if dmy_match:
        day = dmy_match.group(1).zfill(2)
        month = dmy_match.group(2).zfill(2)
        year = dmy_match.group(3)
        return f"{year}-{month}-{day}"
    return trimmed

def match_rule(label: str) -> Optional[str]:
    lower = label.lower().strip()
    for path, keywords in LABEL_RULES:
        if any(kw in lower for kw in keywords):
            return path
    return None

def set_path(record: CanonicalRecord, path: str, value: str) -> None:
    section, key = path.split('.')
    final_value = value
    if path == 'student.dateOfBirth':
        final_value = normalize_date_value(value) or value
    
    sec_obj = getattr(record, section)
    setattr(sec_obj, key, final_value)

def normalize_fields(fields: List[ExtractedField]) -> Tuple[CanonicalRecord, List[UnmappedField]]:
    record = empty_canonical_record()
    unmapped: List[UnmappedField] = []

    for field in fields:
        path = match_rule(field.label)
        if path:
            set_path(record, path, field.value)
        else:
            unmapped.append(UnmappedField(label=field.label, value=field.value))

    return record, unmapped

def normalize_document_fields(
    fields: List[ExtractedField],
    warnings: Optional[List[str]] = None,
    raw_text: str = "",
) -> DocumentData:
    record, unmapped = normalize_fields(fields)
    return DocumentData(
        rawText=raw_text,
        fields=fields,
        record=record,
        student=record.student,
        parent=record.parent,
        address=record.address,
        unmapped=unmapped,
        warnings=warnings or [],
    )
