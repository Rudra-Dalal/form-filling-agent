import asyncio
from pathlib import Path
import pytest
from app.agent.session import AgentSession
from app.document.extractor import extract_document
from app.schemas.common import AgentState, EventType

FIXTURES_DIR = Path(__file__).resolve().parent.parent.parent.parent / "tests" / "fixtures"
DOCX_FIXTURE = FIXTURES_DIR / "sample-admission-record.docx"
HTML_FIXTURE_URL = (FIXTURES_DIR / "sample-registration-form.html").as_uri()

@pytest.mark.asyncio
async def test_fixture_dryrun_end_to_end():
    """
    SECTION 24 CANONICAL END-TO-END ACCEPTANCE TEST:
    - Input: sample-admission-record.docx
    - Form: sample-registration-form.html
    - Document parsed with canonical fields
    - Address ambiguity detected
    - User answers 'Grade 5' -> rejected, remains WAITING_FOR_USER
    - User answers 'permanent' -> accepted, proceeds
    - Browser DOM verified across all fields
    - Hosteler remains untouched
    - Final state: READY_FOR_REVIEW
    - Form remains unsubmitted
    """
    # 1. Parse document
    doc_data = extract_document(DOCX_FIXTURE, dry_run=True)
    assert doc_data.student.fullName == "Aditi Rakesh Sharma"
    assert doc_data.student.dateOfBirth == "2015-03-12"
    assert doc_data.student.gender == "Female"
    assert doc_data.student.grade == "Grade 8"
    assert doc_data.parent.fatherName == "Rakesh Kumar Sharma"
    assert doc_data.parent.motherName == "Sunita Sharma"
    assert doc_data.parent.contactNumber == "9876543210"

    events = []
    session = AgentSession(
        target_url=HTML_FIXTURE_URL,
        instruction="Read this document and fill the student registration form.",
        document_data=doc_data,
        dry_run=True,
        on_event=lambda evt: events.append(evt),
    )

    # 2. Run session in background task
    run_task = asyncio.create_task(session.run())

    # Wait for ask_user event (address ambiguity)
    for _ in range(50):
        if session.state == AgentState.WAITING_FOR_USER:
            break
        await asyncio.sleep(0.05)

    assert session.state == AgentState.WAITING_FOR_USER
    ask_evt = next((e for e in events if e["type"] == EventType.ASK_USER.value), None)
    assert ask_evt is not None
    prompt_id = ask_evt["promptId"]

    # Test invalid answer rejection: 'Grade 5'
    session.provide_user_answer(prompt_id, "Grade 5")
    await asyncio.sleep(0.1)

    # Agent must reject 'Grade 5' and remain in WAITING_FOR_USER
    assert session.state == AgentState.WAITING_FOR_USER

    # Now provide valid answer: 'permanent'
    session.provide_user_answer(prompt_id, "permanent")

    # Await completion
    await run_task

    # 3. Verify terminal state is strictly READY_FOR_REVIEW
    assert session.state == AgentState.READY_FOR_REVIEW

    # 4. Verify field verifications occurred
    verify_events = [e for e in events if e["type"] == EventType.VERIFY_RESULT.value]
    assert len(verify_events) >= 8
    assert all(v["matches"] for v in verify_events)

    # 5. VERIFY ACTUAL VALUES IN THE BROWSER DOM
    page = session.browser_session.page
    assert await page.input_value("#full-name") == "Aditi Rakesh Sharma"
    assert await page.input_value("#birth-date") == "2015-03-12"
    assert (await page.eval_on_selector("#gender", "el => el.value")).lower() == "female"
    assert (await page.eval_on_selector("#grade", "el => el.value")) == "8"
    assert await page.input_value("#father-name") == "Rakesh Kumar Sharma"
    assert await page.input_value("#mother-name") == "Sunita Sharma"
    assert await page.input_value("#contact") == "9876543210"
    assert await page.input_value("#street") == "14 Lotus Lane"
    assert await page.input_value("#city") == "Nagpur"
    assert await page.input_value("#state") == "Maharashtra"
    assert await page.input_value("#pincode") == "440001"

    # Hosteler remains untouched
    assert await page.is_checked("#hosteler") is False

    # Confirm checkbox remained untouched
    assert await page.is_checked("#confirm") is False

    # Form was NEVER submitted
    was_submitted = await page.evaluate("() => Boolean(window.__submitted)")
    assert was_submitted is False

    await session.close()
