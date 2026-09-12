/**
 * Classifies, filters, and structures detected form controls on the page.
 */

/**
 * Categorizes an element snapshot entry into a structured form field description.
 * @param {import('../shared/types').DetectedFormField} element
 * @returns {string} Control category ('text' | 'select' | 'checkbox' | 'radio' | 'button' | 'other')
 */
function classifyControl(element) {
  const tag = (element.tag || '').toLowerCase();
  const type = (element.type || '').toLowerCase();

  if (tag === 'select') return 'select';
  if (tag === 'textarea') return 'text';
  if (tag === 'button' || type === 'button' || type === 'submit') return 'button';

  if (tag === 'input') {
    if (type === 'checkbox') return 'checkbox';
    if (type === 'radio') return 'radio';
    if (['text', 'email', 'tel', 'number', 'date', 'password', 'url'].includes(type)) {
      return 'text';
    }
  }

  return 'other';
}

/**
 * Filters elements to return only fillable form fields (excluding buttons and non-inputs).
 * @param {Array<import('../shared/types').DetectedFormField>} elements
 * @returns {Array<import('../shared/types').DetectedFormField>}
 */
function filterFillableFields(elements = []) {
  return elements.filter((el) => {
    const category = classifyControl(el);
    return ['text', 'select', 'checkbox', 'radio'].includes(category);
  });
}

module.exports = {
  classifyControl,
  filterFillableFields,
};
