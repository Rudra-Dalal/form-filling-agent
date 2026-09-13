import re
from pathlib import Path
from typing import Optional, Any
from playwright.async_api import Page
from .models import VerifyResult
from .inspector import inspect_page

ROMAN_NUMERAL_MAP = {
    'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5,
    'vi': 6, 'vii': 7, 'viii': 8, 'ix': 9, 'x': 10,
    'xi': 11, 'xii': 12
}

def normalize_date_for_comparison(val: Optional[str]) -> Optional[str]:
    if not val or not isinstance(val, str):
        return None
    trimmed = val.strip()
    # YYYY-MM-DD
    iso_match = re.match(r'^(\d{4})-(\d{1,2})-(\d{1,2})$', trimmed)
    if iso_match:
        return f"{iso_match.group(1)}-{iso_match.group(2).zfill(2)}-{iso_match.group(3).zfill(2)}"
    # DD/MM/YYYY or DD-MM-YYYY
    dmy_match = re.match(r'^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$', trimmed)
    if dmy_match:
        return f"{dmy_match.group(3)}-{dmy_match.group(2).zfill(2)}-{dmy_match.group(1).zfill(2)}"
    return None

def extract_grade_number(text: str) -> Optional[int]:
    clean = text.strip().lower()
    num = re.search(r'\d+', clean)
    if num:
        return int(num.group(0))
    words = re.findall(r'[a-z]+', clean)
    for w in words:
        if w in ROMAN_NUMERAL_MAP:
            return ROMAN_NUMERAL_MAP[w]
    return None

async def verify_field(page: Page, element_index: int, expected_value: Any) -> VerifyResult:
    """Re-reads an element from the page and verifies whether its current value matches expected."""
    snapshot = await inspect_page(page)
    field = next((el for el in snapshot if el.elementIndex == element_index), None)

    if not field:
        return VerifyResult(
            elementIndex=element_index,
            expected=str(expected_value),
            actual="NOT_FOUND",
            matches=False,
            details=f"Field with index {element_index} not found on page.",
        )

    def clean_text(s: Any) -> str:
        if s is None:
            return ""
        return re.sub(r'\s+', ' ', str(s)).strip().lower()

    matches = False
    actual = ""

    if field.type == "file":
        actual = str(field.currentValue or "")
        expected_filename = Path(str(expected_value)).name.lower()
        matches = expected_filename in actual.lower()

    elif field.tagName == "select":
        selected_text = clean_text(field.selectedText)
        selected_val = clean_text(field.selectedValue)
        current_val = clean_text(field.currentValue)
        expected = clean_text(expected_value)

        actual = field.selectedText or field.selectedValue or field.currentValue or ""
        matches = (selected_text == expected or selected_val == expected or current_val == expected)

        if not matches:
            exp_num = extract_grade_number(expected)
            act_num = extract_grade_number(f"{selected_text} {selected_val} {current_val}")
            if exp_num is not None and act_num is not None and exp_num == act_num:
                matches = True

    elif field.type in ("checkbox", "radio"):
        expected_bool = expected_value if isinstance(expected_value, bool) else str(expected_value).lower() in ("true", "1", "yes")
        actual_bool = bool(field.checked)
        actual = str(actual_bool)
        matches = (actual_bool == expected_bool)

    else:
        actual = str(field.currentValue or "")
        norm_expected = clean_text(expected_value)
        norm_actual = clean_text(actual)
        matches = (norm_actual == norm_expected)

        if not matches:
            # Date normalization
            exp_date = normalize_date_for_comparison(str(expected_value))
            act_date = normalize_date_for_comparison(actual)
            if exp_date and act_date and exp_date == act_date:
                matches = True

        if not matches:
            # Phone number normalization (ignoring formatting like dashes, spaces, brackets)
            exp_digits = re.sub(r'\D', '', str(expected_value))
            act_digits = re.sub(r'\D', '', actual)
            if exp_digits and act_digits and (exp_digits == act_digits or act_digits.endswith(exp_digits) or exp_digits.endswith(act_digits)):
                matches = True

    return VerifyResult(
        elementIndex=element_index,
        expected=str(expected_value),
        actual=actual,
        matches=matches,
        controlType=field.classification,
        details="Verified against DOM value." if matches else "Value mismatch.",
    )
