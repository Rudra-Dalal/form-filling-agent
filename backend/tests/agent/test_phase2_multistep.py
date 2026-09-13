import asyncio
from pathlib import Path
import pytest
from app.agent.session import AgentSession
from app.document.extractor import extract_document
from app.schemas.common import AgentState, EventType

FIXTURES_DIR = Path(__file__).resolve().parent.parent.parent.parent / "tests" / "fixtures"
DOCX_FIXTURE = FIXTURES_DIR / "sample-admission-record.docx"
MULTISTEP_HTML_URL = (FIXTURES_DIR / "05-multi-step.html").as_uri()

@pytest.mark.asyncio
async def test_multistep_form_automation_full_flow():
    """
    SECTION 6.1 MULTI-STEP FORMS:
    Tests automated multi-step traversal through Step 1, Step 2, and Step 3:
    - Step 1: Personal Information (Student Name, DOB, Gender, Grade) -> Safe Next
    - Step 2: Parent Details (Father Name, Mother Name, Contact) -> Safe Next
    - Step 3: Address Details (Street, City, State, PIN) -> Stopped before submit
    - Final state: READY_FOR_REVIEW
    - Final submit button remains un-clicked
    """
    doc_data = extract_document(DOCX_FIXTURE, dry_run=True)
    doc_data.warnings = []
    events = []

    session = AgentSession(
        target_url=MULTISTEP_HTML_URL,
        instruction="Complete all steps of the multi-step admission form.",
        document_data=doc_data,
        dry_run=True,
        on_event=lambda evt: events.append(evt),
    )

    await session.run()

    # 1. State must reach READY_FOR_REVIEW
    assert session.state == AgentState.READY_FOR_REVIEW

    # 2. Check that step changed events occurred
    step_events = [e for e in events if e["type"] == EventType.STEP_CHANGED.value]
    assert len(step_events) >= 2, "Agent must have clicked navigation next controls for step 1 and step 2"

    # 3. Verify actual DOM values in browser
    page = session.browser_session.page
    assert await page.input_value("#step1-name") == "Aditi Rakesh Sharma"
    assert await page.input_value("#step1-dob") == "2015-03-12"
    assert (await page.eval_on_selector("#step1-gender", "el => el.value")).lower() == "female"
    assert await page.input_value("#step2-father") == "Rakesh Kumar Sharma"
    assert await page.input_value("#step2-mother") == "Sunita Sharma"
    assert await page.input_value("#step2-contact") == "9876543210"
    assert await page.input_value("#step3-street") == "14 Lotus Lane"
    assert await page.input_value("#step3-city") == "Nagpur"
    assert await page.input_value("#step3-state") == "Maharashtra"
    assert await page.input_value("#step3-pincode") == "440001"

    # 4. CRITICAL INVARIANT: Final submit button was NEVER clicked
    was_submitted = await page.evaluate("() => Boolean(window.__submitted)")
    assert was_submitted is False, "Final submit button must never be clicked by the agent"

    await session.close()
