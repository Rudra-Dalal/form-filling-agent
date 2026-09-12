/**
 * DOM evaluation script injected into the page to identify interactive elements
 * using the "set-of-marks" approach. Assigns stable numeric indices for LLM reasoning.
 */

const COLLECT_ELEMENTS_SCRIPT = `
(() => {
  const selector = 'input, select, textarea, button, [role="button"], [contenteditable="true"]';
  const nodes = Array.from(document.querySelectorAll(selector));
  window.__agentElements = nodes;

  function labelFor(node) {
    if (node.labels && node.labels.length) {
      return Array.from(node.labels).map((l) => l.innerText.trim()).join(' ');
    }
    if (node.getAttribute('aria-label')) return node.getAttribute('aria-label');
    if (node.placeholder) return node.placeholder;
    if (node.name) return node.name;
    const prev = node.previousElementSibling;
    if (prev && prev.innerText) return prev.innerText.trim();
    return '';
  }

  return nodes.map((node, index) => {
    let options;
    if (node.tagName === 'SELECT') {
      options = Array.from(node.options).map((o) => o.text.trim());
    }
    return {
      index,
      tag: node.tagName.toLowerCase(),
      type: node.type || null,
      label: labelFor(node).slice(0, 200),
      currentValue: node.tagName === 'SELECT' ? node.value : (node.value ?? node.innerText ?? ''),
      checked: node.type === 'checkbox' || node.type === 'radio' ? node.checked : undefined,
      options,
      required: Boolean(node.required || node.getAttribute('aria-required') === 'true'),
    };
  });
})();
`;

/**
 * Inspects a Playwright page and returns all detected interactive elements.
 * @param {import('playwright').Page} page
 * @returns {Promise<import('../shared/types').DetectedFormField[]>}
 */
async function inspectPage(page) {
  if (!page) {
    throw new Error('Cannot inspect page: Page is not available.');
  }
  return page.evaluate(COLLECT_ELEMENTS_SCRIPT);
}

module.exports = {
  COLLECT_ELEMENTS_SCRIPT,
  inspectPage,
};
