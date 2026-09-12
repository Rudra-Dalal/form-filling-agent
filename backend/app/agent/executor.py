from typing import Dict, Any, Callable, Optional, Awaitable
from ..schemas.common import AgentState, EventType
from ..schemas.browser import FormSnapshot, VerifyResult
from ..browser.browser import BrowserSession
from ..browser.actions import (
    fill_text,
    clear_field,
    select_option,
    set_checkbox,
    click_element,
    SafetyViolationError,
    BrowserActionError,
)
from ..browser.verifier import verify_field
from ..policy.engine import PolicyEngine, PolicyViolationError
from .planner import AgentPlanner

class ToolExecutor:
    """Coordinates tool execution through the PolicyEngine and browser session."""
    def __init__(
        self,
        browser_session: BrowserSession,
        planner: AgentPlanner,
        policy_engine: PolicyEngine,
        emit: Callable[[str, Dict[str, Any]], None],
        ask_user: Callable[[str, Optional[str]], Awaitable[str]],
        hand_over_to_user: Callable[[str], Awaitable[None]],
        get_state: Callable[[], AgentState],
        get_snapshot: Callable[[], Optional[FormSnapshot]],
    ):
        self.browser_session = browser_session
        self.planner = planner
        self.policy_engine = policy_engine
        self.emit = emit
        self.ask_user = ask_user
        self.hand_over_to_user = hand_over_to_user
        self.get_state = get_state
        self.get_snapshot = get_snapshot

    async def execute(self, tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        # Emit tool call event
        self.emit(EventType.TOOL_CALL, {"name": tool_name, "input": tool_input})

        # 1. Policy check before any action
        current_state = self.get_state()
        current_snapshot = self.get_snapshot()
        self.policy_engine.evaluate(tool_name, tool_input, current_state, current_snapshot)

        page = self.browser_session.page
        if not page and tool_name not in ("ask_user", "hand_over_to_user", "finish_filling"):
            raise BrowserActionError("Browser page is not active.")

        # Normalize camelCase vs snake_case inputs
        idx = tool_input.get("elementIndex") if "elementIndex" in tool_input else tool_input.get("element_index")

        try:
            if tool_name == "read_form":
                snapshot = await self.browser_session.read_form()
                self.emit(EventType.FORM_SNAPSHOT, {"snapshot": [el.model_dump() for el in snapshot.elements]})
                return {"ok": True, "elements": snapshot.elements}

            elif tool_name == "fill_text":
                val = tool_input.get("value", "")
                await fill_text(page, idx, val)
                self.planner.record_filled(idx)
                self.emit(EventType.FIELD_FILLED, {"elementIndex": idx, "value": val})
                return {"ok": True}

            elif tool_name == "clear_field":
                await clear_field(page, idx)
                return {"ok": True}

            elif tool_name == "select_option":
                lbl = tool_input.get("optionLabel") or tool_input.get("option_label", "")
                await select_option(page, idx, lbl)
                self.planner.record_filled(idx)
                self.emit(EventType.FIELD_FILLED, {"elementIndex": idx, "value": lbl})
                return {"ok": True}

            elif tool_name == "set_checkbox":
                chk = bool(tool_input.get("checked", False))
                await set_checkbox(page, idx, chk)
                self.planner.record_filled(idx)
                self.emit(EventType.FIELD_FILLED, {"elementIndex": idx, "value": chk})
                return {"ok": True}

            elif tool_name == "verify_field":
                exp = tool_input.get("expectedValue") if "expectedValue" in tool_input else tool_input.get("expected_value")
                result = await verify_field(page, idx, exp)
                if result.matches:
                    self.planner.record_verified(idx)
                self.emit(EventType.VERIFY_RESULT, {
                    "elementIndex": idx,
                    "expected": result.expected,
                    "actual": result.actual,
                    "matches": result.matches,
                })
                return {"ok": True, "matches": result.matches, "actual": result.actual}

            elif tool_name == "click_element":
                await click_element(page, idx)
                return {"ok": True}

            elif tool_name == "ask_user":
                q = tool_input.get("question", "")
                ctx = tool_input.get("context", "")
                answer = await self.ask_user(q, ctx)
                return {"ok": True, "answer": answer}

            elif tool_name == "hand_over_to_user":
                reason = tool_input.get("reason", "")
                await self.hand_over_to_user(reason)
                return {"ok": True, "status": "handed_over"}

            elif tool_name == "finish_filling":
                summary = tool_input.get("summary", "Form filled and verified.")
                self.emit(EventType.COMPLETE, {"summary": summary})
                return {"ok": True, "summary": summary}

            else:
                raise ValueError(f"Unrecognized tool: {tool_name}")

        except Exception as err:
            self.emit(EventType.TOOL_ERROR, {"name": tool_name, "message": str(err)})
            raise
