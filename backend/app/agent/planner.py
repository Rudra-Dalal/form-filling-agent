from typing import Dict, Any, List, Set, Optional
from ..schemas.document import DocumentData
from ..schemas.browser import FormElement
from ..browser.mapper import find_best_field_match

class FillPlanCandidate:
    def __init__(self, element_index: int, label: str, doc_key: str, value: Any):
        self.element_index = element_index
        self.label = label
        self.doc_key = doc_key
        self.value = value

    def to_dict(self) -> Dict[str, Any]:
        return {
            "elementIndex": self.element_index,
            "label": self.label,
            "docKey": self.doc_key,
            "value": self.value,
        }

class AgentPlanner:
    """Evaluates mapping between extracted document fields and browser form elements."""
    def __init__(self, document_data: DocumentData | Dict[str, Any]):
        self.document_data = document_data
        self.filled_fields: Set[int] = set()
        self.verified_fields: Set[int] = set()

    def generate_fill_plan(self, form_snapshot: List[FormElement]) -> List[FillPlanCandidate]:
        candidates: List[FillPlanCandidate] = []

        student = getattr(self.document_data, "student", None) or self.document_data.get("student", {})
        parent = getattr(self.document_data, "parent", None) or self.document_data.get("parent", {})
        address = getattr(self.document_data, "address", None) or self.document_data.get("address", {})

        def check_category(category_name: str, cat_obj: Any):
            data_dict = cat_obj.model_dump() if hasattr(cat_obj, "model_dump") else cat_obj
            if isinstance(data_dict, dict):
                for key, val in data_dict.items():
                    if not val:
                        continue
                    full_key = f"{category_name}.{key}"
                    match = find_best_field_match(full_key, form_snapshot)
                    if match and match.elementIndex not in self.filled_fields:
                        candidates.append(FillPlanCandidate(
                            element_index=match.elementIndex,
                            label=match.label,
                            doc_key=full_key,
                            value=val,
                        ))

        check_category("student", student)
        check_category("parent", parent)
        check_category("address", address)

        # Also process unmapped fields
        unmapped = getattr(self.document_data, "unmapped", None) or self.document_data.get("unmapped", [])
        for item in unmapped:
            item_val = getattr(item, "value", None) or (item.get("value") if isinstance(item, dict) else None)
            item_lbl = getattr(item, "label", None) or (item.get("label") if isinstance(item, dict) else None)
            if not item_val or not item_lbl:
                continue
            match = find_best_field_match(item_lbl, form_snapshot)
            if match and match.elementIndex not in self.filled_fields:
                if not any(c.element_index == match.elementIndex for c in candidates):
                    candidates.append(FillPlanCandidate(
                        element_index=match.elementIndex,
                        label=match.label,
                        doc_key=item_lbl,
                        value=item_val,
                    ))

        return candidates

    def record_filled(self, element_index: int) -> None:
        self.filled_fields.add(element_index)

    def record_verified(self, element_index: int) -> None:
        self.verified_fields.add(element_index)

    def is_field_verified(self, element_index: int) -> bool:
        return element_index in self.verified_fields
