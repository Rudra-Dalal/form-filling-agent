const { inspectPage } = require('./page-inspector');

/**
 * Re-reads an element from the page and verifies whether its current value matches the expected value.
 *
 * @param {import('playwright').Page} page
 * @param {number} elementIndex
 * @param {string|boolean} expectedValue
 * @returns {Promise<{matches: boolean, actual: string|null, element: Object|null}>}
 */
async function verifyField(page, elementIndex, expectedValue) {
  const snapshot = await inspectPage(page);
  const field = snapshot.find((el) => el.index === elementIndex);

  if (!field) {
    return {
      matches: false,
      actual: null,
      element: null,
      error: `Field with index ${elementIndex} not found on page.`,
    };
  }

  let actual = null;
  if (field.tag === 'select') {
    actual = String(field.currentValue ?? '');
  } else if (field.type === 'checkbox' || field.type === 'radio') {
    actual = String(Boolean(field.checked));
  } else {
    actual = String(field.currentValue ?? '');
  }

  const normalizedExpected = String(expectedValue).trim().toLowerCase();
  const normalizedActual = String(actual).trim().toLowerCase();

  const matches = normalizedActual === normalizedExpected;

  return {
    matches,
    actual,
    element: field,
  };
}

module.exports = { verifyField };
