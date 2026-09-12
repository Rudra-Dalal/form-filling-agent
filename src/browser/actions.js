const { BrowserActionError, SafetyViolationError } = require('../shared/errors');

/**
 * Resolves a Playwright ElementHandle for a given numbered index in window.__agentElements.
 * @param {import('playwright').Page} page
 * @param {number} elementIndex
 * @returns {Promise<import('playwright').ElementHandle>}
 */
async function getElementHandle(page, elementIndex) {
  if (!page) throw new BrowserActionError('Page instance is not available.');

  const handle = await page.evaluateHandle(
    (idx) => window.__agentElements && window.__agentElements[idx],
    elementIndex
  );
  const element = handle.asElement();
  if (!element) {
    throw new BrowserActionError(
      `No element found at index ${elementIndex}. The form layout may have updated; call read_form again.`
    );
  }
  return element;
}

/**
 * Visually highlights an element on the visible page for user observability.
 * @param {import('playwright').Page} page
 * @param {number} elementIndex
 */
async function highlightElement(page, elementIndex) {
  try {
    await page.evaluate((idx) => {
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
    }, elementIndex);
  } catch (_) {}
}

/**
 * Fills text into an input, textarea, or contenteditable element.
 * @param {import('playwright').Page} page
 * @param {number} elementIndex
 * @param {string} value
 */
async function fillText(page, elementIndex, value) {
  await highlightElement(page, elementIndex);
  const handle = await getElementHandle(page, elementIndex);
  await handle.fill(String(value));
}

/**
 * Clears an input, textarea, or contenteditable element.
 * @param {import('playwright').Page} page
 * @param {number} elementIndex
 */
async function clearField(page, elementIndex) {
  await highlightElement(page, elementIndex);
  const handle = await getElementHandle(page, elementIndex);
  await handle.fill('');
}

/**
 * Selects an option from a <select> element by visible label text or value.
 * Supports case-insensitivity and value fallbacks.
 * @param {import('playwright').Page} page
 * @param {number} elementIndex
 * @param {string} optionLabel
 */
async function selectOption(page, elementIndex, optionLabel) {
  await highlightElement(page, elementIndex);
  const handle = await getElementHandle(page, elementIndex);

  try {
    await handle.selectOption({ label: optionLabel });
    return;
  } catch (_) {
    // Attempt case-insensitive or value-based selection in DOM
    const selected = await page.evaluate(
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
      },
      { idx: elementIndex, target: optionLabel }
    );

    if (!selected) {
      throw new BrowserActionError(
        `Could not select option "${optionLabel}" at element index ${elementIndex}.`
      );
    }
  }
}

/**
 * Toggles a checkbox or radio button.
 * @param {import('playwright').Page} page
 * @param {number} elementIndex
 * @param {boolean} shouldBeChecked
 */
async function setCheckbox(page, elementIndex, shouldBeChecked) {
  await highlightElement(page, elementIndex);
  const handle = await getElementHandle(page, elementIndex);
  const isChecked = await handle.isChecked();
  if (isChecked !== shouldBeChecked) {
    await handle.click();
  }
}

/**
 * Clicks an interactive element.
 * STRICT SAFETY INVARIANT: Enforces submission prohibition.
 * Attempts to click a submit button or submit-intent control will throw SafetyViolationError.
 * @param {import('playwright').Page} page
 * @param {number} elementIndex
 */
async function clickElement(page, elementIndex) {
  if (!page) throw new BrowserActionError('Page instance is not available.');

  // Check for submit intent before clicking
  const isSubmit = await page.evaluate((idx) => {
    const node = window.__agentElements && window.__agentElements[idx];
    if (!node) return false;
    const type = (node.type || '').toLowerCase();
    const text = (node.innerText || node.value || node.getAttribute('aria-label') || '').toLowerCase();
    const name = (node.name || '').toLowerCase();
    const id = (node.id || '').toLowerCase();

    if (type === 'submit') return true;

    const submitKeywords = /submit|apply now|register now|complete application|send registration/i;
    if (submitKeywords.test(text) || submitKeywords.test(name) || submitKeywords.test(id)) {
      return true;
    }
    return false;
  }, elementIndex);

  if (isSubmit) {
    throw new SafetyViolationError(
      `CRITICAL SAFETY VIOLATION: Autonomous form submission is strictly prohibited. Agent cannot click submit buttons (element index ${elementIndex}).`
    );
  }

  await highlightElement(page, elementIndex);
  const handle = await getElementHandle(page, elementIndex);
  await handle.click();
}

module.exports = {
  getElementHandle,
  fillText,
  clearField,
  selectOption,
  setCheckbox,
  clickElement,
  highlightElement,
};
