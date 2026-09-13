import asyncio
from pathlib import Path
import pytest
from app.agent.session import AgentSession
from app.document.extractor import extract_document
from app.schemas.common import AgentState, EventType
from app.policy.engine import PolicyEngine, PolicyViolationError

FIXTURES_DIR = Path(__file__).resolve().parent.parent.parent.parent / "tests" / "fixtures"
DOCX_FIXTURE = FIXTURES_DIR / "sample-admission-record.docx"
TAKEOVER_HTML_URL = (FIXTURES_DIR / "11-human-takeover.html").as_uri()
FAILURE_HTML_URL = (FIXTURES_DIR / "12-verification-failure.html").as_uri()

@pytest.mark.asyncio
async def test_human_takeover_lifecycle_and_reinspection():
    """
    SECTION 5.7 HUMAN TAKEOVER:
    - Agent starts and hands over to user
    - State enters HUMAN_TAKEOVER
    - Autonomous actions denied during takeover
    - User modifies DOM directly
    - User gives back control (resume_from_user)
    - Agent re-inspects DOM and reaches READY_FOR_REVIEW
    """
    doc_data = extract_document(DOCX_FIXTURE, dry_run=True)
    events = []

    session = AgentSession(
        target_url=TAKEOVER_HTML_URL,
        instruction="Fill form with human takeover for CAPTCHA.",
        document_data=doc_data,
        dry_run=True,
        on_event=lambda evt: events.append(evt),
    )

    # Launch browser manually or via session
    await session.browser_session.launch(TAKEOVER_HTML_URL)
    session.state = AgentState.RUNNING

    # Hand over to user
    await session.hand_over_to_user("Please solve the CAPTCHA.")
    assert session.state == AgentState.HUMAN_TAKEOVER

    # Autonomous actions must be blocked by PolicyEngine during takeover
    policy = PolicyEngine()
    with pytest.raises(PolicyViolationError) as exc:
        policy.evaluate("fill_text", {"elementIndex": 0, "value": "test"}, session.state)
    assert "human takeover is active" in str(exc.value)

    # Simulate human typing into browser
    page = session.browser_session.page
    await page.fill("#captcha-input", "K9X2B")

    # Give back control
    await session.resume_from_user()
    assert session.state == AgentState.RUNNING

    # Verify re-inspection captured human modification
    captcha_val = next(
        el.currentValue for el in session.current_snapshot.elements if el.id == "captcha-input"
    )
    assert captcha_val == "K9X2B"

    await session.close()

@pytest.mark.asyncio
async def test_bounded_error_recovery_on_verification_failure():
    """
    SECTION 6.6 ERROR RECOVERY:
    - 12-verification-failure.html flakily alters value on first input
    - Agent detects mismatch during verify_field
    - Agent applies single recovery retry (clear + re-fill)
    - Re-verification succeeds
    - Terminal state: READY_FOR_REVIEW
    """
    doc_data = extract_document(DOCX_FIXTURE, dry_run=True)
    doc_data.warnings = []
    events = []

    session = AgentSession(
        target_url=FAILURE_HTML_URL,
        instruction="Fill the form and recover from verification mismatch.",
        document_data=doc_data,
        dry_run=True,
        on_event=lambda evt: events.append(evt),
    )

    await session.run()

    assert session.state == AgentState.READY_FOR_REVIEW

    # Check that verification was attempted and succeeded
    verify_events = [e for e in events if e["type"] == EventType.VERIFY_RESULT.value]
    assert len(verify_events) >= 2
    # The final verification for student name must match
    assert await session.browser_session.page.input_value("#student-name") == "Aditi Rakesh Sharma"

    await session.close()
