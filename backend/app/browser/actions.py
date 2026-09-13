import re
from pathlib import Path
from typing import Any, Optional
from playwright.async_api import Page, ElementHandle

class BrowserActionError(Exception):
    """Raised when a browser automation action fails."""
    pass

class SafetyViolationError(Exception):
    """CRITICAL: Raised when autonomous submission is attempted."""
    pass

async def get_element_handle(page: Page, element_index: int) -> ElementHandle:
    if not page:
        raise BrowserActionError("Page instance is not available.")

    handle = await page.evaluate_handle(
        "idx => window.__agentElements && window.__agentElements[idx]",
        element_index
    )
    element = handle.as_element()
    if not element:
        raise BrowserActionError(
            f"No element found at index {element_index}. The form layout may have changed."
        )
    return element

async def highlight_element(page: Page, element_index: int) -> None:
    try:
        await page.evaluate("""
        idx => {
            const node = window.__agentElements && window.__agentElements[idx];
            if (node) {
                node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                const prevOutline = node.style.outline;
                node.style.outline = '3px solid #3b82f6';
                node.style.boxShadow = '0 0 8px rgba(59, 130, 246, 0.6)';
                setTimeout(() => {
                    node.style.outline = prevOutline;
                    node.style.boxShadow = '';
                }, 1200);
            }
        }
        """, element_index)
    except Exception:
        pass

async def fill_text(page: Page, element_index: int, value: str) -> None:
    await highlight_element(page, element_index)
    handle = await get_element_handle(page, element_index)
    await handle.fill(str(value))

async def clear_field(page: Page, element_index: int) -> None:
    await highlight_element(page, element_index)
    handle = await get_element_handle(page, element_index)
    await handle.fill("")

async def select_option(page: Page, element_index: int, option_label: str) -> None:
    await highlight_element(page, element_index)
    handle = await get_element_handle(page, element_index)

    try:
        await handle.select_option(label=option_label)
    except Exception:
        # Fallback to case-insensitive and value matching in DOM
        selected = await page.evaluate("""
        ({ idx, target }) => {
            const node = window.__agentElements && window.__agentElements[idx];
            if (!node || node.tagName !== 'SELECT') return false;
            const targetLower = String(target).trim().toLowerCase();
            for (let i = 0; i < node.options.length; i++) {
                const opt = node.options[i];
                if (
                    opt.text.trim().toLowerCase() === targetLower ||
                    opt.value.trim().toLowerCase() === targetLower ||
                    opt.text.trim().toLowerCase().includes(targetLower)
                ) {
                    node.selectedIndex = i;
                    node.dispatchEvent(new Event('change', { bubbles: true }));
                    node.dispatchEvent(new Event('input', { bubbles: true }));
                    return true;
                }
            }
            return false;
        }
        """, {"idx": element_index, "target": option_label})

        if not selected:
            raise BrowserActionError(
                f'Could not select option "{option_label}" at element index {element_index}.'
            )

async def set_checkbox(page: Page, element_index: int, should_be_checked: bool) -> None:
    await highlight_element(page, element_index)
    handle = await get_element_handle(page, element_index)
    is_checked = await handle.is_checked()
    if is_checked != should_be_checked:
        await handle.click()

async def set_radio(page: Page, element_index: int) -> None:
    await highlight_element(page, element_index)
    handle = await get_element_handle(page, element_index)
    await handle.check()

async def upload_file(page: Page, element_index: int, file_path: str) -> None:
    path = Path(file_path)
    if not path.exists():
        raise BrowserActionError(f"Upload file not found: {file_path}")

    await highlight_element(page, element_index)
    handle = await get_element_handle(page, element_index)

    # Validate input is type="file"
    input_type = await handle.get_attribute("type")
    if input_type != "file":
        raise BrowserActionError(f"Target element {element_index} is not an input[type='file'].")

    # Validate accept attribute if defined
    accept = await handle.get_attribute("accept")
    if accept:
        allowed = [ext.strip().lower() for ext in accept.split(",")]
        file_ext = path.suffix.lower()
        if not any(file_ext == a or a.endswith(file_ext) or a == "*/*" for a in allowed):
            raise BrowserActionError(
                f"File {path.name} with extension {file_ext} does not match accepted types: {accept}"
            )

    await handle.set_input_files(str(path.resolve()))

    # Verify attachment in DOM
    attached_count = await page.evaluate("""
    idx => {
        const node = window.__agentElements && window.__agentElements[idx];
        return node && node.files ? node.files.length : 0;
    }
    """, element_index)

    if attached_count == 0:
        raise BrowserActionError(f"File attachment verification failed for {file_path}")

async def click_element(page: Page, element_index: int) -> None:
    """
    Clicks an interactive element.
    CRITICAL INVARIANT: Blocks submission attempts semantically and raises SafetyViolationError.
    Checks type, text, name, id, and aria attributes across buttons and links.
    """
    if not page:
        raise BrowserActionError("Page instance is not available.")

    is_submit = await page.evaluate("""
    idx => {
        const node = window.__agentElements && window.__agentElements[idx];
        if (!node) return false;
        const type = (node.type || '').toLowerCase();
        const text = (node.innerText || node.value || node.getAttribute('aria-label') || '').toLowerCase();
        const name = (node.name || '').toLowerCase();
        const id = (node.id || '').toLowerCase();
        const className = (node.className || '').toLowerCase();

        if (type === 'submit') return true;

        const submitKeywords = /\\b(submit|apply|finalize|confirm|pay|place\\s*order|send\\s*application|complete\\s*registration|finish\\s*application|register\\s*now|complete\\s*application|send\\s*registration|proceed\\s*to\\s*pay|proceed\\s*to\\s*checkout|checkout)\\b/i;
        if (
            submitKeywords.test(text) ||
            submitKeywords.test(name) ||
            submitKeywords.test(id) ||
            submitKeywords.test(className)
        ) {
            return true;
        }
        return false;
    }
    """, element_index)

    if is_submit:
        raise SafetyViolationError(
            f"CRITICAL SAFETY VIOLATION: Autonomous form submission is strictly prohibited. "
            f"Agent cannot click submit buttons (element index {element_index})."
        )

    await highlight_element(page, element_index)
    handle = await get_element_handle(page, element_index)
    await handle.click()

async def click_navigation(page: Page, element_index: int) -> None:
    """Safely clicks a form navigation control (e.g. Next / Back step)."""
    await click_element(page, element_index)
