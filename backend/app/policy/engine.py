from typing import Dict, Any, Optional
from ..schemas.common import AgentState
from ..schemas.browser import FormSnapshot, FormElement
from ..browser.actions import SafetyViolationError
from ..browser.detector import is_submit_control

class PolicyViolationError(Exception):
    """Raised when an action violates policy constraints."""
    pass

class PolicyEngine:
    """Dedicated policy & safety engine enforcing Phase-1 constraints independently of the LLM."""
    def __init__(self, allowed_tools: Optional[list[str]] = None):
        self.allowed_tools = set(allowed_tools or [
            "read_form",
            "fill_text",
            "clear_field",
            "select_option",
            "set_checkbox",
            "verify_field",
            "click_element",
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
        # 1. Submission tool invariant
        if tool_name == "submit_form" or "submit" in tool_name.lower():
            raise SafetyViolationError(
                "CRITICAL SAFETY VIOLATION: Autonomous form submission is strictly prohibited in Phase 1."
            )

        # 2. Permitted tool list
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

        # 4. Deep inspection for click_element on submit controls
        if tool_name == "click_element":
            element_index = tool_input.get("elementIndex")
            if snapshot and element_index is not None:
                target_el = next((el for el in snapshot.elements if el.elementIndex == element_index), None)
                if target_el and (target_el.isSubmit or is_submit_control(target_el)):
                    raise SafetyViolationError(
                        f"CRITICAL SAFETY VIOLATION: Autonomous form submission is strictly prohibited. "
                        f"Target element index {element_index} is a submit-intent control."
                    )
