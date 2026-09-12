from pathlib import Path
import pytest
from app.browser.browser import BrowserSession
from app.browser.inspector import inspect_page
from app.browser.actions import (
    fill_text,
    clear_field,
    select_option,
    set_checkbox,
    click_element,
    SafetyViolationError,
)
from app.browser.verifier import verify_field

FIXTURES_DIR = Path(__file__).resolve().parent.parent.parent.parent / "tests" / "fixtures"
HTML_FIXTURE_URL = (FIXTURES_DIR / "sample-registration-form.html").as_uri()

@pytest.mark.asyncio
async def test_browser_actions_and_submission_safety():
    session = BrowserSession(headless=True)
    try:
        page = await session.launch(HTML_FIXTURE_URL)
        elements = await inspect_page(page)
        assert len(elements) >= 10

        # Find Student Name input
        name_field = next(el for el in elements if "name" in el.label.lower())
        await fill_text(page, name_field.elementIndex, "Aditi Rakesh Sharma")
        res = await verify_field(page, name_field.elementIndex, "Aditi Rakesh Sharma")
        assert res.matches is True

        # Clear field
        await clear_field(page, name_field.elementIndex)
        res_empty = await verify_field(page, name_field.elementIndex, "")
        assert res_empty.matches is True

        # Fill again
        await fill_text(page, name_field.elementIndex, "Aditi Rakesh Sharma")

        # Select option for Gender
        gender_field = next(el for el in elements if "gender" in el.label.lower())
        await select_option(page, gender_field.elementIndex, "Female")
        res_gender = await verify_field(page, gender_field.elementIndex, "Female")
        assert res_gender.matches is True

        # Checkbox
        hostel_field = next((el for el in elements if "hostel" in el.label.lower()), None)
        if hostel_field:
            await set_checkbox(page, hostel_field.elementIndex, True)
            res_hostel = await verify_field(page, hostel_field.elementIndex, True)
            assert res_hostel.matches is True
            await set_checkbox(page, hostel_field.elementIndex, False)
            res_hostel_off = await verify_field(page, hostel_field.elementIndex, False)
            assert res_hostel_off.matches is True

        # Date normalization check
        dob_field = next(el for el in elements if "dob" in el.label.lower() or "date of birth" in el.label.lower())
        await fill_text(page, dob_field.elementIndex, "2015-03-12")
        res_dob = await verify_field(page, dob_field.elementIndex, "12/03/2015")
        assert res_dob.matches is True

        # CRITICAL SAFETY TEST: Attempting to click submit button MUST raise SafetyViolationError
        submit_btn = next(el for el in elements if el.isSubmit or "submit" in el.label.lower())
        with pytest.raises(SafetyViolationError) as exc_info:
            await click_element(page, submit_btn.elementIndex)
        assert "CRITICAL SAFETY VIOLATION" in str(exc_info.value)

    finally:
        await session.close()
