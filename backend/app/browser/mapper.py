import re
from typing import Dict, List, Optional, Any
from .models import FormElement

ROMAN_NUMERAL_MAP = {
    'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5,
    'vi': 6, 'vii': 7, 'viii': 8, 'ix': 9, 'x': 10,
    'xi': 11, 'xii': 12
}

NUM_TO_ROMAN_MAP = {v: k for k, v in ROMAN_NUMERAL_MAP.items()}

KNOWN_FIELD_SYNONYMS: Dict[str, List[str]] = {
    'student.fullName': [
        'name of student',
        'student name',
        "student's name",
        'student full name',
        "student's full name",
        'candidate name',
        'candidate full name',
        'applicant name',
        'applicant full name',
        'full name',
        'first name',
        'name',
    ],
    'student.dateOfBirth': ['dob', 'date of birth', 'birth date', 'birthdate', 'd.o.b'],
    'student.gender': ['gender', 'sex'],
    'student.grade': ['applying for grade', 'grade', 'class', 'admission to grade', 'applying for class', 'std', 'standard'],
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

    # File uploads
    'document.upload': [
        'student photo',
        'photograph',
        'photo',
        'identity document',
        'birth certificate',
        'upload document',
        'id proof',
        'supporting document',
    ],
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
        # Ignore buttons, action controls, and radio inputs (radios handled by find_best_radio_match)
        if field.tagName == 'button' or field.type in ('button', 'submit', 'reset', 'radio') or field.isSubmit:
            continue
        if field.actionType in ('SUBMISSION', 'NAVIGATION_NEXT', 'NAVIGATION_BACK'):
            continue

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

    # 4. Number match & Roman numeral conversion
    # E.g. "Grade 8" or "8" <-> "VIII", "Class 8", "8"
    num_match = re.search(r'\d+', target)
    target_num = int(num_match.group(0)) if num_match else None

    # Check if target is a Roman numeral (e.g. "viii")
    if not target_num:
        words = re.findall(r'[a-z]+', target)
        for w in words:
            if w in ROMAN_NUMERAL_MAP:
                target_num = ROMAN_NUMERAL_MAP[w]
                break

    if target_num is not None:
        target_roman = NUM_TO_ROMAN_MAP.get(target_num, "")
        for opt in field.options:
            opt_text_clean = opt.text.strip().lower()
            opt_val_clean = opt.value.strip().lower()
            
            # Numeric match
            opt_num_match = re.search(r'\d+', opt_text_clean) or re.search(r'\d+', opt_val_clean)
            if opt_num_match and int(opt_num_match.group(0)) == target_num:
                return opt.text or opt.value

            # Roman numeral match
            if target_roman:
                opt_words = re.findall(r'[a-z]+', opt_text_clean)
                if target_roman in opt_words or opt_val_clean == target_roman:
                    return opt.text or opt.value

    return None

def find_best_radio_match(
    doc_field_key: str,
    target_value: Any,
    detected_fields: List[FormElement]
) -> Optional[FormElement]:
    """Finds the matching radio element for a given field key and value."""
    radios = [f for f in detected_fields if f.type == "radio"]
    target_str = str(target_value).strip().lower()

    # Look for matching field by group name / legend / label
    matching_group: List[FormElement] = []
    for r in radios:
        if score_field_match(doc_field_key, r.name) >= 0.6:
            matching_group.append(r)
        elif r.legend and score_field_match(doc_field_key, r.legend) >= 0.6:
            matching_group.append(r)

    if not matching_group:
        matching_group = radios

    # 1. Exact match on label, value, id
    for r in matching_group:
        lbl = (r.label or "").strip().lower()
        val = (r.value or r.currentValue or "").strip().lower()
        r_id = (r.id or "").strip().lower()
        if target_str == lbl or target_str == val or target_str == r_id:
            return r

    # 2. Whole token / word boundary match
    for r in matching_group:
        lbl = (r.label or "").strip().lower()
        lbl_words = set(re.findall(r'[a-z0-9]+', lbl))
        val_words = set(re.findall(r'[a-z0-9]+', (r.value or "").lower()))
        id_words = set(re.findall(r'[a-z0-9]+', (r.id or "").lower()))
        if target_str in lbl_words or target_str in val_words or target_str in id_words:
            return r

    # 3. Controlled prefix/suffix match (avoiding sub-word confusion like male in female)
    for r in matching_group:
        lbl = (r.label or "").strip().lower()
        val = (r.value or "").strip().lower()
        if target_str.startswith(lbl) and len(lbl) > 2:
            return r
        if target_str.startswith(val) and len(val) > 2:
            return r

    return None
