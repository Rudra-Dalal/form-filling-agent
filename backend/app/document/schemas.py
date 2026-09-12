from typing import Dict, Any, List, Optional
from ..schemas.document import CanonicalRecord, StudentInfo, ParentInfo, AddressInfo

ALLOWED_CANONICAL_KEYS = {
    "student": {"fullName", "dateOfBirth", "gender", "grade", "applicantName"},
    "parent": {"fatherName", "motherName", "contactNumber"},
    "address": {"street", "city", "state", "pincode", "residentialAddress"},
}

def empty_canonical_record() -> CanonicalRecord:
    """Returns a fresh empty CanonicalRecord matching the expected schema."""
    return CanonicalRecord(
        student=StudentInfo(),
        parent=ParentInfo(),
        address=AddressInfo(),
    )

def validate_canonical_record(record: CanonicalRecord | Dict[str, Any]) -> List[str]:
    """
    Validates that only allowed keys exist in the canonical record.
    Returns a list of error strings for invalid keys or sections.
    """
    errors: List[str] = []
    data = record.model_dump() if isinstance(record, CanonicalRecord) else record

    for section, fields in data.items():
        if section not in ALLOWED_CANONICAL_KEYS:
            errors.append(f"Unexpected section in canonical record: {section}")
            continue
        allowed = ALLOWED_CANONICAL_KEYS[section]
        for key in fields.keys():
            if key not in allowed:
                errors.append(f"Unexpected key in canonical section '{section}': {key}")

    return errors
