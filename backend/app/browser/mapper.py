import re
from typing import Dict, List, Optional
from .models import FormElement

KNOWN_FIELD_SYNONYMS: Dict[str, List[str]] = {
    'student.fullName': [
        'name of student',
        'student name',
        "student's name",
        'student full name',
        "student's full name",
        'candidate name',
        'applicant name',
        'full name',
        'first name',
        'name',
    ],
    'student.dateOfBirth': ['dob', 'date of birth', 'birth date', 'birthdate', 'd.o.b'],
    'student.gender': ['gender', 'sex'],
    'student.grade': ['applying for grade', 'grade', 'class', 'admission to grade', 'applying for class'],
    'student.bloodGroup': ['blood group', 'blood type', 'blood'],
    'student.nationality': ['nationality', 'citizenship'],

    'parent.fatherName': [
        "father's full name",
        'father full name',
        'father name',
        "father's name",
        'father',
        'guardian name (father)',
    ],
    'parent.motherName': [
        "mother's full name",
        'mother full name',
        'mother name',
        "mother's name",
        'mother',
        'guardian name (mother)',
    ],
    'parent.guardianName': ['guardian name', "guardian's name", 'guardian'],
    'parent.contactNumber': [
        'primary contact number',
        'primary contact',
        'contact number',
        'contact no',
        'mobile number',
        'phone number',
        'mobile',
        'phone',
        'contact',
        'telephone',
    ],
    'parent.email': ['email', 'e-mail', 'email address'],

    'address.street': [
        'residential address',
        'street',
        'address line 1',
        'address',
        'residential address line 1',
        'permanent address',
        'permanent address line 1',
    ],
    'address.city': ['city / town', 'city', 'town', 'district'],
    'address.state': ['state', 'province'],
    'address.pincode': ['pin code', 'postal code / pin', 'pincode', 'pin', 'zip', 'zipcode', 'postal code'],
}

def clean_alphanumeric(s: str) -> str:
    return re.sub(r'[^a-z0-9]', '', s.lower())

def clean_with_spaces(s: str) -> str:
    return re.sub(r'[^a-z0-9]+', ' ', s.lower()).strip()

def score_field_match(doc_field_key: str, website_label: Optional[str]) -> float:
    if not website_label or not isinstance(website_label, str):
        return 0.0

    label_clean = clean_alphanumeric(website_label)
    label_spaces = clean_with_spaces(website_label)
    key_lower = doc_field_key.lower()

    # Direct match for exact labels
    if label_spaces == key_lower or label_clean == clean_alphanumeric(key_lower):
        return 1.0

    synonyms = KNOWN_FIELD_SYNONYMS.get(doc_field_key, [])
    if not synonyms and "grade" in key_lower:
        synonyms = KNOWN_FIELD_SYNONYMS.get('student.grade', [])

    for raw_syn in synonyms:
        syn_clean = clean_alphanumeric(raw_syn)
        syn_spaces = clean_with_spaces(raw_syn)
        if label_clean == syn_clean or label_spaces == syn_spaces:
            return 1.0
        if syn_clean in label_clean or syn_spaces in label_spaces:
            return 0.85
        if label_clean in syn_clean or label_spaces in syn_spaces:
            return 0.8

    parts = doc_field_key.split('.')
    last_part_clean = clean_alphanumeric(parts[-1])
    if last_part_clean and (last_part_clean in label_clean or label_clean in last_part_clean):
        return 0.65

    return 0.0

def find_best_field_match(doc_field_key: str, detected_fields: List[FormElement]) -> Optional[FormElement]:
    best_score = 0.0
    best_match: Optional[FormElement] = None

    for field in detected_fields:
        score = score_field_match(doc_field_key, field.label)

        if field.legend and field.label:
            combined_score = score_field_match(doc_field_key, f"{field.legend} {field.label}")
            if combined_score > score:
                score = combined_score

        if score < 0.8:
            if field.name:
                name_score = score_field_match(doc_field_key, field.name)
                if name_score > score:
                    score = name_score * 0.9
            if field.id:
                id_score = score_field_match(doc_field_key, field.id)
                if id_score > score:
                    score = id_score * 0.9
            if field.placeholder:
                ph_score = score_field_match(doc_field_key, field.placeholder)
                if ph_score > score:
                    score = ph_score * 0.85

        if score > best_score and score >= 0.6:
            best_score = score
            best_match = field

    return best_match

def find_matching_option(target_value: str, field: FormElement) -> Optional[str]:
    if not field.options:
        return None

    target = str(target_value).strip().lower()

    # 1. Exact match on option text (case-insensitive)
    for opt in field.options:
        if opt.text.strip().lower() == target:
            return opt.text

    # 2. Exact match on option value
    for opt in field.options:
        if opt.value.strip().lower() == target:
            return opt.text or opt.value

    # 3. Substring match
    for opt in field.options:
        opt_lower = opt.text.strip().lower()
        if opt_lower and (target in opt_lower or opt_lower in target):
            if "select" not in opt_lower and "choose" not in opt_lower:
                return opt.text

    # 4. Number match (e.g. "Grade 8" -> number 8 matches option value "8" or text "8")
    num_match = re.search(r'\d+', target)
    if num_match:
        num = num_match.group(0)
        for opt in field.options:
            if num in opt.text or opt.value == num:
                return opt.text

    return None
