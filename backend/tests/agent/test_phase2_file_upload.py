import asyncio
from pathlib import Path
import pytest
from app.agent.session import AgentSession
from app.document.extractor import extract_document
from app.schemas.common import AgentState, EventType
from app.browser.actions import upload_file, BrowserActionError
from app.browser.verifier import verify_field
from app.browser.inspector import inspect_page
from playwright.async_api import async_playwright

FIXTURES_DIR = Path(__file__).resolve().parent.parent.parent.parent / "tests" / "fixtures"
DOCX_FIXTURE = FIXTURES_DIR / "sample-admission-record.docx"
UPLOAD_HTML_URL = (FIXTURES_DIR / "09-file-upload.html").as_uri()

@pytest.mark.asyncio
async def test_file_upload_tool_and_dom_verification():
    """
    SECTION 6.5 FILE UPLOADS:
    - Verifies upload_file attaches permitted local document
    - Verifies file attachment is verified in DOM
    - Verifies extension validation against accept filter
    - Verifies form remains unsubmitted
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(UPLOAD_HTML_URL)

        elements = await inspect_page(page)
        file_el = next((e for e in elements if e.id == "doc-proof"), None)
        assert file_el is not None

        # 1. Execute upload_file
        await upload_file(page, file_el.elementIndex, str(DOCX_FIXTURE))

        # 2. Verify field in DOM
        v_res = await verify_field(page, file_el.elementIndex, str(DOCX_FIXTURE))
        assert v_res.matches is True
        assert "sample-admission-record.docx" in v_res.actual.lower()

        # 3. Validation rejection for non-matching extensions
        photo_el = next((e for e in elements if e.id == "student-photo"), None)
        assert photo_el is not None
        # photo_el accepts .png,.jpg,.jpeg,.docx; let's test a rejected extension
        fake_bad_file = FIXTURES_DIR / "test_script.sh"
        fake_bad_file.write_text("#!/bin/sh")
        try:
            with pytest.raises(BrowserActionError):
                await upload_file(page, photo_el.elementIndex, str(fake_bad_file))
        finally:
            if fake_bad_file.exists():
                fake_bad_file.unlink()

        # Form must remain unsubmitted
        was_submitted = await page.evaluate("() => Boolean(window.__submitted)")
        assert was_submitted is False

        await browser.close()
