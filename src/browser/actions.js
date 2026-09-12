const { BrowserError } = require('../shared/errors');

/**
 * Resolves a Playwright ElementHandle for a given numbered index in window.__agentElements.
 * @param {import('playwright').Page} page
 * @param {number} elementIndex
 * @returns {Promise<import('playwright').ElementHandle>}
 */
async function getElementHandle(page, elementIndex) {
  if (!page) throw new BrowserError('Page instance is not available.');

  const handle = await page.evaluateHandle(
    (idx) => window.__agentElements && window.__agentElements[idx],
    elementIndex
  );
  const element = handle.asElement();
  if (!element) {
    throw new BrowserError(
      `No element found at index ${elementIndex}. The form layout may have updated; call read_form again.`
    );
  }
  return element;
}

/**
 * Fills text into an input, textarea, or contenteditable element.
 * @param {import('playwright').Page} page
 * @param {number} elementIndex
 * @param {string} value
 */
async function fillText(page, elementIndex, value) {
  const handle = await getElementHandle(page, elementIndex);
  await handle.fill(String(value));
}

/**
 * Selects an option from a <select> element by visible label text.
 * @param {import('playwright').Page} page
 * @param {number} elementIndex
 * @param {string} optionLabel
 */
async function selectOption(page, elementIndex, optionLabel) {
  const handle = await getElementHandle(page, elementIndex);
  await handle.selectOption({ label: optionLabel });
}

/**
 * Toggles a checkbox or radio button.
 * @param {import('playwright').Page} page
 * @param {number} elementIndex
 * @param {boolean} shouldBeChecked
 */
async function setCheckbox(page, elementIndex, shouldBeChecked) {
  const handle = await getElementHandle(page, elementIndex);
  const isChecked = await handle.isChecked();
  if (isChecked !== shouldBeChecked) {
    await handle.click();
  }
}

/**
 * Clicks an interactive element.
 * @param {import('playwright').Page} page
 * @param {number} elementIndex
 */
async function clickElement(page, elementIndex) {
  const handle = await getElementHandle(page, elementIndex);
  await handle.click();
}

module.exports = {
  getElementHandle,
  fillText,
  selectOption,
  setCheckbox,
  clickElement,
};
