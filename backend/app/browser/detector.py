import re
from typing import List, Dict, Any, Union
from .models import FormElement

SUBMIT_KEYWORDS_PATTERN = re.compile(
    r'submit|apply now|register now|complete application|send registration',
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
        if el_type in ("text", "email", "tel", "number", "date", "password", "url"):
            return "text"

    return "other"

def is_submit_control(element: Union[FormElement, Dict[str, Any]]) -> bool:
    """
    Determines whether an element has form submission intent.
    Enforces strict Phase-1 safety invariant prohibiting autonomous form submission.
    """
    el_type = _get_prop(element, "type").lower()
    tag = _get_prop(element, "tagName", "tag").lower()
    label = _get_prop(element, "label").lower()
    el_id = _get_prop(element, "id").lower()
    name = _get_prop(element, "name").lower()

    if el_type == "submit":
        return True

    if (tag == "button" or el_type == "button") and SUBMIT_KEYWORDS_PATTERN.search(label):
        return True

    if SUBMIT_KEYWORDS_PATTERN.search(el_id) or SUBMIT_KEYWORDS_PATTERN.search(name):
        return True

    return False

def filter_fillable_fields(elements: List[FormElement]) -> List[FormElement]:
    """Filters elements to return only fillable form fields (excluding buttons and non-inputs)."""
    result: List[FormElement] = []
    for el in elements:
        if is_submit_control(el):
            continue
        cat = classify_control(el)
        if cat in ("text", "select", "checkbox", "radio"):
            result.append(el)
    return result
