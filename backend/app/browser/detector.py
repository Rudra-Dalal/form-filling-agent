import re
from typing import List, Dict, Any, Union
from .models import FormElement

# Comprehensive submission keywords covering explicit buttons, transactions, and semantic submission intents
SUBMIT_KEYWORDS_PATTERN = re.compile(
    r'\b(submit|apply|finalize|confirm|pay|place\s*order|'
    r'send\s*application|complete\s*registration|finish\s*application|'
    r'register\s*now|complete\s*application|send\s*registration|'
    r'proceed\s*to\s*pay|proceed\s*to\s*checkout|checkout)\b',
    re.IGNORECASE
)

NAVIGATION_NEXT_PATTERN = re.compile(
    r'\b(next|continue|proceed|next\s*step|go\s*to\s*next|forward)\b',
    re.IGNORECASE
)

NAVIGATION_BACK_PATTERN = re.compile(
    r'\b(previous|prev|back|go\s*back|prior|step\s*back)\b',
    re.IGNORECASE
)

CONSENT_KEYWORDS_PATTERN = re.compile(
    r'\b(agree|consent|terms|condition|declaration|accurate|certify|acknowledge|pledge|swear|undertaking)\b',
    re.IGNORECASE
)

def _get_prop(element: Any, *keys: str) -> str:
    if isinstance(element, dict):
        for k in keys:
            v = element.get(k)
            if v:
                return str(v)
    else:
        for k in keys:
            v = getattr(element, k, None)
            if v:
                return str(v)
    return ""

def classify_control(element: Union[FormElement, Dict[str, Any]]) -> str:
    """Categorizes an element into a structured form field description."""
    tag = _get_prop(element, "tagName", "tag").lower()
    el_type = _get_prop(element, "type").lower()

    if tag == "select":
        return "select"
    if tag == "textarea":
        return "text"
    if tag == "button" or el_type in ("button", "submit"):
        return "button"

    if tag == "input":
        if el_type == "checkbox":
            return "checkbox"
        if el_type == "radio":
            return "radio"
        if el_type == "file":
            return "file"
        if el_type in ("text", "email", "tel", "number", "date", "password", "url"):
            return "text"

    return "other"

def is_submit_control(element: Union[FormElement, Dict[str, Any]]) -> bool:
    """
    Determines whether an element has form submission intent.
    Enforces strict safety invariant prohibiting autonomous form submission.
    Checks type, label, id, name, and aria-labels semantically.
    """
    el_type = _get_prop(element, "type").lower()
    tag = _get_prop(element, "tagName", "tag").lower()
    label = _get_prop(element, "label").lower()
    el_id = _get_prop(element, "id").lower()
    name = _get_prop(element, "name").lower()
    aria_label = _get_prop(element, "ariaLabel").lower()
    curr_val = _get_prop(element, "currentValue").lower()

    if el_type == "submit":
        return True

    # Check button controls or inputs acting as buttons
    is_btn_like = (tag in ("button", "a")) or (el_type in ("button", "submit", "image"))
    if is_btn_like:
        for text_source in (label, curr_val, aria_label, el_id, name):
            if text_source and SUBMIT_KEYWORDS_PATTERN.search(text_source):
                return True

    # Check id / name for explicit submit intent
    if SUBMIT_KEYWORDS_PATTERN.search(el_id) or SUBMIT_KEYWORDS_PATTERN.search(name):
        return True

    return False

def is_consent_checkbox(element: Union[FormElement, Dict[str, Any]]) -> bool:
    """
    Detects if a checkbox implies legal consent, declarations, or acceptance of terms.
    The agent must never automatically check these without human authorization.
    """
    el_type = _get_prop(element, "type").lower()
    tag = _get_prop(element, "tagName", "tag").lower()
    if not (tag == "input" and el_type == "checkbox"):
        return False

    text_to_check = " ".join([
        _get_prop(element, "label"),
        _get_prop(element, "legend"),
        _get_prop(element, "ariaLabel"),
        _get_prop(element, "id"),
        _get_prop(element, "name"),
    ]).lower()

    return bool(CONSENT_KEYWORDS_PATTERN.search(text_to_check))

def classify_action_control(element: Union[FormElement, Dict[str, Any]]) -> str:
    """
    Classifies interactive button/link controls for multi-step navigation:
    - SUBMISSION
    - NAVIGATION_NEXT
    - NAVIGATION_BACK
    - UNKNOWN
    """
    if is_submit_control(element):
        return "SUBMISSION"

    text = " ".join([
        _get_prop(element, "label"),
        _get_prop(element, "currentValue"),
        _get_prop(element, "ariaLabel"),
        _get_prop(element, "id"),
        _get_prop(element, "name"),
    ]).lower()

    if NAVIGATION_NEXT_PATTERN.search(text):
        return "NAVIGATION_NEXT"
    if NAVIGATION_BACK_PATTERN.search(text):
        return "NAVIGATION_BACK"

    return "UNKNOWN"

def filter_fillable_fields(elements: List[FormElement]) -> List[FormElement]:
    """Filters elements to return only fillable form fields (excluding buttons and non-inputs)."""
    result: List[FormElement] = []
    for el in elements:
        if is_submit_control(el):
            continue
        cat = classify_control(el)
        if cat in ("text", "select", "checkbox", "radio", "file"):
            result.append(el)
    return result
