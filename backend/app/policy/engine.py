from typing import Dict, Any, Optional
from ..schemas.common import AgentState
from ..schemas.browser import FormSnapshot, FormElement
from ..browser.actions import SafetyViolationError
from ..browser.detector import is_submit_control, is_consent_checkbox, classify_action_control

class PolicyViolationError(Exception):
    """Raised when an action violates policy constraints."""
    pass

class PolicyEngine:
    """Dedicated policy & safety engine enforcing Phase-1 & Phase-2 safety constraints."""
    def __init__(self, allowed_tools: Optional[list[str]] = None):
        self.allowed_tools = set(allowed_tools or [
            "read_form",
            "fill_text",
            "clear_field",
            "select_option",
            "set_checkbox",
            "set_radio",
            "upload_file",
            "verify_field",
            "click_element",
            "click_navigation",
            "ask_user",
            "hand_over_to_user",
            "finish_filling",
        ])

    def evaluate(
        self,
        tool_name: str,
        tool_input: Dict[str, Any],
        lifecycle_state: AgentState,
        snapshot: Optional[FormSnapshot] = None,
    ) -> None:
        """
        Evaluates a tool request against safety policies.
        Raises SafetyViolationError or PolicyViolationError if denied.
        """
        name_lower = tool_name.lower()

        # 1. Absolute Submission Invariant: Block any submit-oriented tools
        if (
            name_lower == "submit_form" or
            "submit" in name_lower or
            "finalize" in name_lower or
            "pay" in name_lower
        ):
            raise SafetyViolationError(
                "CRITICAL SAFETY VIOLATION: Autonomous form submission is strictly prohibited."
            )

        # 2. Permitted tool list check
        if tool_name not in self.allowed_tools:
            raise PolicyViolationError(
                f"Policy Denial: Tool '{tool_name}' is outside Phase-1 permitted tool scope."
            )

        # 3. Lifecycle state checks
        if lifecycle_state == AgentState.PAUSED:
            raise PolicyViolationError(
                "Policy Denial: Autonomous actions cannot execute while the agent is paused."
            )

        if lifecycle_state == AgentState.HUMAN_TAKEOVER:
            raise PolicyViolationError(
                "Policy Denial: Autonomous actions cannot execute while human takeover is active."
            )

        if lifecycle_state == AgentState.READY_FOR_REVIEW and tool_name not in ("ask_user", "finish_filling"):
            raise PolicyViolationError(
                "Policy Denial: Agent is in terminal READY_FOR_REVIEW state; further autonomous mutations are prohibited."
            )

        if lifecycle_state == AgentState.WAITING_FOR_USER and tool_name != "ask_user":
            raise PolicyViolationError(
                "Policy Denial: Cannot perform actions while waiting for user clarification."
            )

        element_index = tool_input.get("elementIndex") if "elementIndex" in tool_input else tool_input.get("element_index")

        # 4. Element-level inspection
        if snapshot and element_index is not None:
            target_el = next((el for el in snapshot.elements if el.elementIndex == element_index), None)

            if target_el:
                # Check for submission intent on clicks and navigation
                if tool_name in ("click_element", "click_navigation"):
                    if target_el.isSubmit or is_submit_control(target_el):
                        raise SafetyViolationError(
                            f"CRITICAL SAFETY VIOLATION: Autonomous form submission is strictly prohibited. "
                            f"Target element index {element_index} is a submit-intent control."
                        )

                # Check for consent / declaration checkboxes
                if tool_name == "set_checkbox":
                    checked = tool_input.get("checked", False)
                    if checked and (target_el.isConsent or is_consent_checkbox(target_el)):
                        user_authorized = tool_input.get("userAuthorized", False)
                        if not user_authorized:
                            raise PolicyViolationError(
                                f"Policy Denial: Automated checking of legal consent / declaration box "
                                f"(index {element_index}) is prohibited without explicit user authorization."
                            )

                # Check for file upload target type
                if tool_name == "upload_file":
                    if target_el.type != "file":
                        raise PolicyViolationError(
                            f"Policy Denial: Target element index {element_index} is not an input[type='file']."
                        )
