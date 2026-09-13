import pytest
from pathlib import Path
from playwright.async_api import async_playwright
from app.policy.engine import PolicyEngine, SafetyViolationError
from app.browser.inspector import inspect_page
from app.browser.actions import click_element
from app.browser.detector import is_submit_control, classify_action_control
from app.schemas.common import AgentState
from app.schemas.browser import FormSnapshot

FIXTURES_DIR = Path(__file__).resolve().parent.parent.parent.parent / "tests" / "fixtures"
ADVERSARIAL_HTML_URL = (FIXTURES_DIR / "10-submission-attempt.html").as_uri()

@pytest.mark.asyncio
async def test_adversarial_submission_buttons_all_blocked():
    """
    SECTION 15.4 & SECTION 2 CRITICAL SAFETY INVARIANT:
    Verifies that every submission-intent button in 10-submission-attempt.html
    is flagged as a submit control and strictly blocked across all safety layers:
    - detector.is_submit_control == True
    - detector.classify_action_control == 'SUBMISSION'
    - policy_engine.evaluate() raises SafetyViolationError
    - actions.click_element() raises SafetyViolationError
    - window.__submitted remains un-triggered
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(ADVERSARIAL_HTML_URL)

        elements = await inspect_page(page)
        snapshot = FormSnapshot(url=ADVERSARIAL_HTML_URL, elements=elements)
        policy = PolicyEngine()

        adversarial_ids = [
            "btn-finalize",
            "btn-apply-now",
            "btn-pay",
            "btn-place-order",
            "btn-send-app",
            "btn-complete-reg",
            "btn-finish",
            "btn-standard-submit",
        ]

        for btn_id in adversarial_ids:
            el = next((e for e in elements if e.id == btn_id), None)
            assert el is not None, f"Button {btn_id} must be detected in DOM snapshot"

            # 1. Detector layer
            assert is_submit_control(el) is True, f"Element {btn_id} must be detected as submit control"
            assert classify_action_control(el) == "SUBMISSION", f"Element {btn_id} must be classified as SUBMISSION"

            # 2. Policy engine layer
            with pytest.raises(SafetyViolationError):
                policy.evaluate("click_element", {"elementIndex": el.elementIndex}, AgentState.RUNNING, snapshot)

            # 3. Browser actions runtime DOM layer
            with pytest.raises(SafetyViolationError):
                await click_element(page, el.elementIndex)

        # 4. Confirm the safe navigation button is NOT blocked
        safe_btn = next((e for e in elements if e.id == "safe-next-btn"), None)
        assert safe_btn is not None
        assert is_submit_control(safe_btn) is False
        assert classify_action_control(safe_btn) == "NAVIGATION_NEXT"

        # Policy allows clicking safe navigation button
        policy.evaluate("click_element", {"elementIndex": safe_btn.elementIndex}, AgentState.RUNNING, snapshot)
        await click_element(page, safe_btn.elementIndex)

        # Verify page state: nav was clicked, submit was NEVER clicked
        nav_clicked = await page.evaluate("() => window.__navClicked")
        assert nav_clicked is True
        was_submitted = await page.evaluate("() => Boolean(window.__submitted)")
        assert was_submitted is False

        await browser.close()
