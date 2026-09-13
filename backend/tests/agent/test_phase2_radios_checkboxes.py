import asyncio
from pathlib import Path
import pytest
from app.agent.session import AgentSession
from app.document.extractor import extract_document
from app.schemas.common import AgentState
from app.policy.engine import PolicyEngine, PolicyViolationError
from app.browser.inspector import inspect_page
from app.schemas.browser import FormSnapshot
from playwright.async_api import async_playwright

FIXTURES_DIR = Path(__file__).resolve().parent.parent.parent.parent / "tests" / "fixtures"
DOCX_FIXTURE = FIXTURES_DIR / "sample-admission-record.docx"
RADIO_HTML_URL = (FIXTURES_DIR / "07-radio-form.html").as_uri()
CHECKBOX_HTML_URL = (FIXTURES_DIR / "08-checkbox-form.html").as_uri()

@pytest.mark.asyncio
async def test_radio_button_selection_intelligence():
    """
    SECTION 6.3 RADIO INTELLIGENCE:
    Tests radio button group selection:
    - Matches student gender (Female) to specific radio button in group
    - Verifies checked state in DOM
    - Final state reaches READY_FOR_REVIEW
    """
    doc_data = extract_document(DOCX_FIXTURE, dry_run=True)
    doc_data.warnings = []
    events = []

    session = AgentSession(
        target_url=RADIO_HTML_URL,
        instruction="Fill the form using appropriate radio buttons.",
        document_data=doc_data,
        dry_run=True,
        on_event=lambda evt: events.append(evt),
    )

    await session.run()

    assert session.state == AgentState.READY_FOR_REVIEW

    page = session.browser_session.page
    assert await page.input_value("#student-name") == "Aditi Rakesh Sharma"
    assert await page.is_checked("#gender-female") is True
    assert await page.is_checked("#gender-male") is False

    await session.close()

@pytest.mark.asyncio
async def test_checkbox_intelligence_and_consent_safety():
    """
    SECTION 6.4 CHECKBOX INTELLIGENCE:
    - Never automatically checks legal consent / declaration checkboxes
    - Policy Engine blocks un-authorized automated checking of consent boxes
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(CHECKBOX_HTML_URL)

        elements = await inspect_page(page)
        snapshot = FormSnapshot(url=CHECKBOX_HTML_URL, elements=elements)
        policy = PolicyEngine()

        consent_el = next((e for e in elements if e.id == "terms-consent"), None)
        assert consent_el is not None
        assert consent_el.isConsent is True, "terms-consent must be detected as a consent checkbox"

        # Policy Engine must reject checking this consent box without authorization
        with pytest.raises(PolicyViolationError) as exc:
            policy.evaluate("set_checkbox", {"elementIndex": consent_el.elementIndex, "checked": True}, AgentState.RUNNING, snapshot)
        assert "consent" in str(exc.value).lower()

        # Authorized call succeeds
        policy.evaluate("set_checkbox", {"elementIndex": consent_el.elementIndex, "checked": True, "userAuthorized": True}, AgentState.RUNNING, snapshot)

        await browser.close()
