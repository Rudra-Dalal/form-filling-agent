const { inspectPage } = require('./page-inspector');

function normalizeDateForComparison(val) {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  // YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }
  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
  }
  return null;
}

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
  let matches = false;

  const cleanText = (s) => (s ?? '').toString().replace(/\s+/g, ' ').trim().toLowerCase();

  if (field.tag === 'select') {
    const selectedText = cleanText(field.selectedOptionText);
    const selectedVal = cleanText(field.selectedOptionValue);
    const currentVal = cleanText(field.currentValue);
    const expected = cleanText(expectedValue);

    actual = field.selectedOptionText || field.selectedOptionValue || field.currentValue || '';

    // Check against text, value, or current
    matches = selectedText === expected || selectedVal === expected || currentVal === expected;

    // Substring / number match for dropdowns like "Grade 8" vs value "8"
    if (!matches) {
      const expNum = expected.match(/\d+/);
      const actNum = (selectedText + ' ' + selectedVal).match(/\d+/);
      if (expNum && actNum && expNum[0] === actNum[0]) {
        matches = true;
      }
    }
  } else if (field.type === 'checkbox' || field.type === 'radio') {
    const expectedBool =
      typeof expectedValue === 'boolean'
        ? expectedValue
        : String(expectedValue).toLowerCase() === 'true';
    const actualBool = Boolean(field.checked);
    actual = String(actualBool);
    matches = actualBool === expectedBool;
  } else {
    actual = String(field.currentValue ?? '');
    const normalizedExpected = cleanText(expectedValue);
    const normalizedActual = cleanText(actual);

    matches = normalizedActual === normalizedExpected;

    // Date representation equivalence fallback
    if (!matches) {
      const expDate = normalizeDateForComparison(String(expectedValue));
      const actDate = normalizeDateForComparison(actual);
      if (expDate && actDate && expDate === actDate) {
        matches = true;
      }
    }
  }

  return {
    matches,
    actual,
    element: field,
  };
}

module.exports = { verifyField, normalizeDateForComparison };
