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
 * Determines whether an element has form submission intent.
 * Used to enforce the strict Phase-1 safety rule prohibiting form submission.
 * @param {import('../shared/types').DetectedFormField} element
 * @returns {boolean}
 */
function isSubmitControl(element = {}) {
  const type = (element.type || '').toLowerCase();
  const tag = (element.tag || '').toLowerCase();
  const label = (element.label || '').toLowerCase();
  const id = (element.id || '').toLowerCase();
  const name = (element.name || '').toLowerCase();

  if (type === 'submit') return true;

  const submitKeywords = /submit|apply now|register now|complete application|send registration/i;
  if ((tag === 'button' || type === 'button') && submitKeywords.test(label)) {
    return true;
  }
  if (submitKeywords.test(id) || submitKeywords.test(name)) {
    return true;
  }
  return false;
}

/**
 * Filters elements to return only fillable form fields (excluding buttons and non-inputs).
 * @param {Array<import('../shared/types').DetectedFormField>} elements
 * @returns {Array<import('../shared/types').DetectedFormField>}
 */
function filterFillableFields(elements = []) {
  return elements.filter((el) => {
    if (isSubmitControl(el)) return false;
    const category = classifyControl(el);
    return ['text', 'select', 'checkbox', 'radio'].includes(category);
  });
}

module.exports = {
  classifyControl,
  isSubmitControl,
  filterFillableFields,
};
