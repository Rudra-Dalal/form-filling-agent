import asyncio
from pathlib import Path
import pytest
from app.agent.session import AgentSession
from app.document.extractor import extract_document
from app.schemas.common import AgentState, EventType

FIXTURES_DIR = Path(__file__).resolve().parent.parent.parent.parent / "tests" / "fixtures"
DOCX_FIXTURE = FIXTURES_DIR / "sample-admission-record.docx"
DYNAMIC_HTML_URL = (FIXTURES_DIR / "06-dynamic-fields.html").as_uri()

@pytest.mark.asyncio
async def test_dynamic_form_fields_detection_and_filling():
    """
    SECTION 6.2 DYNAMIC FORMS:
    Tests conditional visibility of form fields:
    - Setting Grade 8 triggers display of senior elective options
    - Agent discovers newly visible elements
    - Session fills and verifies fields
    - Stops at READY_FOR_REVIEW without submitting
    """
    doc_data = extract_document(DOCX_FIXTURE, dry_run=True)
    doc_data.warnings = []
    events = []

    session = AgentSession(
        target_url=DYNAMIC_HTML_URL,
        instruction="Fill the student registration form including conditional options.",
        document_data=doc_data,
        dry_run=True,
        on_event=lambda evt: events.append(evt),
    )

    await session.run()

    assert session.state == AgentState.READY_FOR_REVIEW

    page = session.browser_session.page
    assert await page.input_value("#student-name") == "Aditi Rakesh Sharma"
    assert (await page.eval_on_selector("#grade", "el => el.value")) == "8"

    # Senior options must have become visible in DOM
    is_senior_visible = await page.eval_on_selector(
        "#senior-options",
        "el => el.classList.contains('visible') || window.getComputedStyle(el).display !== 'none'"
    )
    assert is_senior_visible is True

    # Submit was never clicked
    was_submitted = await page.evaluate("() => Boolean(window.__submitted)")
    assert was_submitted is False

    await session.close()
