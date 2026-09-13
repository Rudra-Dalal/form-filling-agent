from typing import Dict, Any, List, Set, Optional
from ..schemas.document import DocumentData
from ..schemas.browser import FormElement
from ..browser.mapper import find_best_field_match, find_best_radio_match, score_field_match
from ..browser.detector import is_consent_checkbox

class FillPlanCandidate:
    def __init__(
        self,
        element_index: int,
        label: str,
        doc_key: str,
        value: Any,
        confidence: str = "high",
        is_radio: bool = False,
        is_file: bool = False,
    ):
        self.element_index = element_index
        self.label = label
        self.doc_key = doc_key
        self.value = value
        self.confidence = confidence
        self.is_radio = is_radio
        self.is_file = is_file

    def to_dict(self) -> Dict[str, Any]:
        return {
            "elementIndex": self.element_index,
            "label": self.label,
            "docKey": self.doc_key,
            "value": self.value,
            "confidence": self.confidence,
            "isRadio": self.is_radio,
            "isFile": self.is_file,
        }

class AgentPlanner:
    """Evaluates mapping between extracted document fields and browser form elements."""
    def __init__(self, document_data: DocumentData | Dict[str, Any]):
        self.document_data = document_data
        self.filled_fields: Set[int] = set()
        self.filled_keys: Set[str] = set()
        self.verified_fields: Set[int] = set()

    def reset_step_indices(self) -> None:
        """Reset per-step element indices when advancing across wizard/multi-step pages."""
        self.filled_fields.clear()

    def generate_fill_plan(
        self,
        form_snapshot: List[FormElement],
        file_attachments: Optional[Dict[str, str]] = None,
    ) -> List[FillPlanCandidate]:
        candidates: List[FillPlanCandidate] = []

        if hasattr(self.document_data, "model_dump"):
            doc_dict = self.document_data.model_dump()
        elif isinstance(self.document_data, dict):
            doc_dict = self.document_data
        else:
            doc_dict = {}

        student = doc_dict.get("student") or {}
        parent = doc_dict.get("parent") or {}
        address = doc_dict.get("address") or {}
        unmapped = doc_dict.get("unmapped") or []

        def process_entry(full_key: str, val: Any):
            if not val or full_key in self.filled_keys:
                return

            # 1. Check for radio fields
            radio_match = find_best_radio_match(full_key, val, form_snapshot)
            if radio_match and radio_match.elementIndex not in self.filled_fields:
                if not any(c.element_index == radio_match.elementIndex for c in candidates):
                    candidates.append(FillPlanCandidate(
                        element_index=radio_match.elementIndex,
                        label=radio_match.label,
                        doc_key=full_key,
                        value=val,
                        confidence="high",
                        is_radio=True,
                    ))
                    return

            # 2. General field match
            match = find_best_field_match(full_key, form_snapshot)
            if match and match.elementIndex not in self.filled_fields:
                # Consent checkboxes are NOT filled automatically
                if match.type == "checkbox" and (match.isConsent or is_consent_checkbox(match)):
                    return

                if not any(c.element_index == match.elementIndex for c in candidates):
                    score = score_field_match(full_key, match.label)
                    conf = "high" if score >= 0.85 else "medium"
                    candidates.append(FillPlanCandidate(
                        element_index=match.elementIndex,
                        label=match.label,
                        doc_key=full_key,
                        value=val,
                        confidence=conf,
                    ))

        def check_category(category_name: str, data_dict: Dict[str, Any]):
            if isinstance(data_dict, dict):
                for key, val in data_dict.items():
                    process_entry(f"{category_name}.{key}", val)

        check_category("student", student)
        check_category("parent", parent)
        check_category("address", address)

        # Process unmapped fields
        for item in unmapped:
            item_val = item.get("value") if isinstance(item, dict) else getattr(item, "value", None)
            item_lbl = item.get("label") if isinstance(item, dict) else getattr(item, "label", None)
            if item_val and item_lbl:
                process_entry(item_lbl, item_val)

        # Process file uploads if file attachments provided or found in snapshot
        file_inputs = [f for f in form_snapshot if f.type == "file" and f.elementIndex not in self.filled_fields]
        if file_inputs and file_attachments:
            for f in file_inputs:
                for key, path in file_attachments.items():
                    if key in self.filled_keys:
                        continue
                    if score_field_match(key, f.label) >= 0.6 or score_field_match(key, f.name) >= 0.6:
                        if not any(c.element_index == f.elementIndex for c in candidates):
                            candidates.append(FillPlanCandidate(
                                element_index=f.elementIndex,
                                label=f.label,
                                doc_key=key,
                                value=path,
                                confidence="high",
                                is_file=True,
                            ))

        return candidates

    def record_filled(self, element_index: int, doc_key: Optional[str] = None) -> None:
        self.filled_fields.add(element_index)
        if doc_key:
            self.filled_keys.add(doc_key)

    def record_verified(self, element_index: int) -> None:
        self.verified_fields.add(element_index)

    def is_field_verified(self, element_index: int) -> bool:
        return element_index in self.verified_fields
