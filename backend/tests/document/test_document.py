from pathlib import Path
import pytest
from app.document.normalizer import match_rule, normalize_fields
from app.document.schemas import empty_canonical_record, validate_canonical_record
from app.document.parsers.docx_parser import parse_docx
from app.document.extractor import extract_document
from app.schemas.document import ExtractedField

FIXTURES_DIR = Path(__file__).resolve().parent.parent.parent.parent / "tests" / "fixtures"
DOCX_FIXTURE = FIXTURES_DIR / "sample-admission-record.docx"

def test_match_rule_maps_common_label_variants():
    assert match_rule("Student Name") == "student.fullName"
    assert match_rule("Date of Birth") == "student.dateOfBirth"
    assert match_rule("DOB") == "student.dateOfBirth"
    assert match_rule("Gender") == "student.gender"
    assert match_rule("Father's Name") == "parent.fatherName"
    assert match_rule("Mother's Name") == "parent.motherName"
    assert match_rule("Contact Number") == "parent.contactNumber"
    assert match_rule("Residential Address") == "address.street"
    assert match_rule("City") == "address.city"
    assert match_rule("State") == "address.state"
    assert match_rule("PIN Code") == "address.pincode"

def test_normalize_fields_builds_canonical_record_and_unmapped():
    fields = [
        ExtractedField(label="Student Name", value="Aditi Sharma"),
        ExtractedField(label="Date of Birth", value="12/03/2015"),
        ExtractedField(label="Gender", value="Female"),
        ExtractedField(label="Custom School ID", value="SCH-9988"),
    ]
    record, unmapped = normalize_fields(fields)
    assert record.student.fullName == "Aditi Sharma"
    # Verify date normalization: 12/03/2015 -> 2015-03-12
    assert record.student.dateOfBirth == "2015-03-12"
    assert record.student.gender == "Female"
    assert len(unmapped) == 1
    assert unmapped[0].label == "Custom School ID"
    assert unmapped[0].value == "SCH-9988"

def test_empty_canonical_record_shape():
    record = empty_canonical_record()
    assert hasattr(record, "student")
    assert hasattr(record, "parent")
    assert hasattr(record, "address")
    errors = validate_canonical_record(record)
    assert len(errors) == 0

def test_validate_canonical_record_flags_invalid_keys():
    invalid_dict = {
        "student": {"fullName": "Aditi", "invalidField": "bad"},
        "parent": {"fatherName": "Rajesh"},
        "address": {},
    }
    errors = validate_canonical_record(invalid_dict)
    assert len(errors) == 1
    assert "invalidField" in errors[0]

def test_parse_docx_reads_fixture():
    raw_text = parse_docx(DOCX_FIXTURE)
    assert len(raw_text) > 50
    assert "Aditi Rakesh Sharma" in raw_text
    assert "Rakesh Kumar Sharma" in raw_text

def test_extract_document_pipeline_on_docx_fixture():
    doc_data = extract_document(DOCX_FIXTURE, dry_run=True)
    assert doc_data.student.fullName == "Aditi Rakesh Sharma"
    assert doc_data.student.dateOfBirth == "2015-03-12"
    assert doc_data.student.gender == "Female"
    assert doc_data.parent.fatherName == "Rakesh Kumar Sharma"
    assert doc_data.parent.motherName == "Sunita Sharma"
    assert doc_data.parent.contactNumber == "9876543210"
    assert len(doc_data.warnings) > 0  # Ambiguous address warning

