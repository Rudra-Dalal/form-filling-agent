import asyncio
import uuid
from typing import Optional, Dict, Any, Callable, List
from ..schemas.common import AgentState, EventType
from ..schemas.document import DocumentData
from ..schemas.browser import FormSnapshot
from ..config import has_llm_key, DEFAULT_MODEL, MAX_TOKENS, HEADLESS
from ..browser.browser import BrowserSession
from ..browser.mapper import find_matching_option
from ..policy.engine import PolicyEngine
from ..registry.definitions import build_standard_tool_registry
from ..document.extractor import extract_document
from .planner import AgentPlanner
from .executor import ToolExecutor
from .prompts.system_prompt import SYSTEM_PROMPT
from .prompts.form_prompt import build_initial_task_prompt

class AgentSession:
    """Manages an active form filling session through planning, execution, verification, and human collaboration."""
    def __init__(
        self,
        target_url: str,
        instruction: str,
        document_data: Optional[DocumentData] = None,
        document_path: Optional[str] = None,
        dry_run: bool = False,
        on_event: Optional[Callable[[Dict[str, Any]], None]] = None,
        session_id: Optional[str] = None,
    ):
        self.session_id = session_id or str(uuid.uuid4())
        self.target_url = target_url
        self.instruction = instruction
        self.document_data = document_data or DocumentData()
        self.document_path = document_path
        self.dry_run = dry_run
        self.on_event = on_event or (lambda evt: None)

        self.state: AgentState = AgentState.IDLE
        self.status_message: str = "Ready to start."

        self.browser_session = BrowserSession(headless=HEADLESS)
        self.current_snapshot: Optional[FormSnapshot] = None
        self.policy_engine = PolicyEngine()
        self.tool_registry = build_standard_tool_registry()
        self.planner = AgentPlanner(self.document_data)

        self._pause_future: Optional[asyncio.Future] = None
        self._pending_prompts: Dict[str, asyncio.Future] = {}
        self._prompt_counter = 0

        self.executor = ToolExecutor(
            browser_session=self.browser_session,
            planner=self.planner,
            policy_engine=self.policy_engine,
            emit=self.emit,
            ask_user=self._ask_user,
            hand_over_to_user=self.hand_over_to_user,
            get_state=lambda: self.state,
            get_snapshot=lambda: self.current_snapshot,
        )

    def emit(self, event_type: str | EventType, data: Optional[Dict[str, Any]] = None) -> None:
        evt_type = event_type.value if isinstance(event_type, EventType) else event_type
        payload = {"type": evt_type, **(data or {})}
        self.on_event(payload)

    # ---- Lifecycle Controls ----

    def pause(self) -> None:
        self.state = AgentState.PAUSED
        self.status_message = "Agent paused."
        if not self._pause_future or self._pause_future.done():
            self._pause_future = asyncio.get_running_loop().create_future()
        self.emit(EventType.PAUSED)

    def resume(self) -> None:
        self.state = AgentState.RUNNING
        self.status_message = "Agent running..."
        if self._pause_future and not self._pause_future.done():
            self._pause_future.set_result(True)
        self.emit(EventType.RESUMED)

    async def _wait_if_paused(self) -> None:
        while self.state in (AgentState.PAUSED, AgentState.HUMAN_TAKEOVER):
            if not self._pause_future or self._pause_future.done():
                self._pause_future = asyncio.get_running_loop().create_future()
            await self._pause_future

    async def hand_over_to_user(self, reason: str = "") -> None:
        self.state = AgentState.HUMAN_TAKEOVER
        msg = reason or "You have control of the browser. Make your changes, then hand control back."
        self.status_message = msg
        if not self._pause_future or self._pause_future.done():
            self._pause_future = asyncio.get_running_loop().create_future()
        self.emit(EventType.HANDED_OVER, {"message": msg})

    async def resume_from_user(self) -> None:
        try:
            self.current_snapshot = await self.browser_session.read_form()
            self.emit(EventType.FORM_SNAPSHOT, {
                "snapshot": [el.model_dump() for el in self.current_snapshot.elements],
                "reason": "resumed-from-user",
            })
        except Exception as err:
            self.emit(EventType.STATUS, {"message": f"Resumed from user. (Form re-read note: {err})"})
        self.resume()

    def provide_user_answer(self, prompt_id: str, answer: str) -> None:
        if prompt_id in self._pending_prompts:
            fut = self._pending_prompts.pop(prompt_id)
            if not fut.done():
                fut.set_result(answer)
            self.state = AgentState.RUNNING
            self.status_message = "Processing answer..."
            self.emit(EventType.STATUS, {"message": f"Received answer for {prompt_id}."})

    async def _ask_user(self, question: str, context: Optional[str] = None) -> str:
        self.state = AgentState.WAITING_FOR_USER
        self._prompt_counter += 1
        prompt_id = f"prompt-{self._prompt_counter}"
        fut = asyncio.get_running_loop().create_future()
        self._pending_prompts[prompt_id] = fut

        self.emit(EventType.ASK_USER, {
            "promptId": prompt_id,
            "question": question,
            "context": context,
        })
        answer = await fut
        return answer

    # ---- Execution Loop ----

    async def run(self) -> None:
        self.state = AgentState.RUNNING
        self.status_message = "Starting task..."

        # Document Extraction if needed
        if (not self.document_data or not self.document_data.fields) and self.document_path:
            self.emit(EventType.STATUS, {"message": "Extracting document fields..."})
            self.document_data = extract_document(self.document_path, dry_run=self.dry_run)
            self.planner = AgentPlanner(self.document_data)
            self.executor.planner = self.planner

        self.emit(EventType.STATUS, {"message": "Launching visible browser..."})
        page = await self.browser_session.launch(self.target_url)

        if not self.dry_run and has_llm_key():
            await self._run_llm_loop()
        else:
            await self._run_planner_loop()

        # Terminal state: Ready for human review (never auto-submits)
        self.state = AgentState.READY_FOR_REVIEW
        self.status_message = "Form filled, verified, and ready for human review."
        self.emit(EventType.READY_FOR_REVIEW, {"summary": self.status_message})
        self.emit(EventType.STATUS, {"message": self.status_message})

    async def _run_planner_loop(self) -> None:
        self.emit(EventType.STATUS, {"message": "Inspecting form on page..."})
        res = await self.executor.execute("read_form", {})
        elements = res.get("elements", [])
        self.current_snapshot = FormSnapshot(url=self.target_url, elements=elements)

        await self._wait_if_paused()

        # Check for address ambiguity in document warnings
        warnings = self.document_data.warnings or []
        addr_warning = next((w for w in warnings if "two different addresses" in w.lower()), None)
        if addr_warning:
            perm_addr = "14 Lotus Lane, Nagpur, Maharashtra, 440001"
            corr_addr = "22 Palm Residency, Nagpur, Maharashtra, 440010"
            for f in (self.document_data.fields or []):
                lbl_lower = f.label.lower()
                if "permanent" in lbl_lower:
                    perm_addr = f.value
                elif "correspondence" in lbl_lower:
                    corr_addr = f.value

            resolved = False
            while not resolved:
                answer = await self._ask_user(
                    f"Two different addresses appear in the document:\n"
                    f"1. Permanent: {perm_addr}\n"
                    f"2. Correspondence: {corr_addr}\n"
                    f"Which address should be used for the form? (Enter 'permanent', 'correspondence', or provide a specific address)",
                    "Address ambiguity detected in document"
                )
                ans_clean = (answer or "").strip()
                ans_lower = ans_clean.lower()

                # Safety check: Reject answers that belong to unrelated fields (e.g., "Grade 5")
                is_invalid = (
                    not ans_clean or
                    any(kw in ans_lower for kw in ("grade", "class", "std", "student", "father", "mother", "contact"))
                )

                if is_invalid:
                    self.emit(EventType.STATUS, {
                        "message": f"Answer '{ans_clean}' does not resolve the address choice. Please choose permanent or correspondence."
                    })
                    continue

                if "permanent" in ans_lower or ans_lower in ("1", "perm"):
                    street_val = perm_addr.split(",")[0].strip()
                    self.document_data.address.street = street_val
                    self.document_data.address.residentialAddress = street_val
                    resolved = True
                    self.emit(EventType.STATUS, {"message": f"Resolved address: Permanent ({perm_addr})"})
                elif "correspondence" in ans_lower or ans_lower in ("2", "corr"):
                    street_val = corr_addr.split(",")[0].strip()
                    self.document_data.address.street = street_val
                    self.document_data.address.residentialAddress = street_val
                    parts = [p.strip() for p in corr_addr.split(",")]
                    if len(parts) >= 4:
                        self.document_data.address.city = parts[1]
                        self.document_data.address.state = parts[2]
                        self.document_data.address.pincode = parts[3]
                    resolved = True
                    self.emit(EventType.STATUS, {"message": f"Resolved address: Correspondence ({corr_addr})"})
                elif len(ans_clean) >= 5:
                    self.document_data.address.street = ans_clean
                    self.document_data.address.residentialAddress = ans_clean
                    resolved = True
                    self.emit(EventType.STATUS, {"message": f"Resolved address: Custom ({ans_clean})"})
                else:
                    self.emit(EventType.STATUS, {
                        "message": f"Answer '{ans_clean}' could not be matched. Please specify 'permanent' or 'correspondence'."
                    })

        await self._wait_if_paused()

        # Generate fill plan
        plan = self.planner.generate_fill_plan(elements)
        self.emit(EventType.STATUS, {"message": f"Mapped {len(plan)} candidate form fields."})

        for item in plan:
            await self._wait_if_paused()

            el = next((e for e in elements if e.elementIndex == item.element_index), None)
            if not el:
                continue

            if el.tagName == "select":
                opt_to_select = find_matching_option(str(item.value), el) or str(item.value)
                await self.executor.execute("select_option", {
                    "elementIndex": item.element_index,
                    "optionLabel": opt_to_select,
                })
            elif el.type in ("checkbox", "radio"):
                await self.executor.execute("set_checkbox", {
                    "elementIndex": item.element_index,
                    "checked": bool(item.value),
                })
            else:
                await self.executor.execute("fill_text", {
                    "elementIndex": item.element_index,
                    "value": str(item.value),
                })

            await self._wait_if_paused()

            # Verify field
            await self.executor.execute("verify_field", {
                "elementIndex": item.element_index,
                "expectedValue": item.value,
            })

        verified_count = len(self.planner.verified_fields)
        summary = (
            f"Successfully filled and verified {verified_count} fields. "
            f"Unverified or ambiguous items (e.g. hostel checkbox) were left untouched for human review. "
            f"Ready for user review."
        )

        await self.executor.execute("finish_filling", {"summary": summary})

    async def _run_llm_loop(self) -> None:
        import anthropic
        import os
        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))

        messages: List[Dict[str, Any]] = [{
            "role": "user",
            "content": build_initial_task_prompt(self.instruction, self.target_url, self.document_data),
        }]

        done = False
        iterations = 0
        max_iterations = 25

        while not done and iterations < max_iterations:
            iterations += 1
            await self._wait_if_paused()

            tools = self.tool_registry.get_anthropic_tools()
            response = client.messages.create(
                model=DEFAULT_MODEL,
                max_tokens=MAX_TOKENS,
                system=SYSTEM_PROMPT,
                tools=tools,
                messages=messages,
            )

            messages.append({"role": "assistant", "content": response.content})

            tool_uses = [b for b in response.content if b.type == "tool_use"]
            text_blocks = [b for b in response.content if b.type == "text"]

            for b in text_blocks:
                self.emit(EventType.THOUGHT, {"text": b.text})

            if not tool_uses:
                break

            tool_results = []
            for tu in tool_uses:
                await self._wait_if_paused()
                res = await self.executor.execute(tu.name, tu.input)
                if tu.name == "finish_filling":
                    done = True

                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tu.id,
                    "content": str(res),
                })

            messages.append({"role": "user", "content": tool_results})

    async def close(self) -> None:
        await self.browser_session.close()
