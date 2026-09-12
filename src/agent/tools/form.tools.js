/**
 * Tool definitions for form interactions: filling text, selecting options,
 * setting checkboxes, and post-fill field verification.
 *
 * NOTE: Phase 1 strictly excludes form submission. There is NO submit_form tool.
 */

const FORM_TOOLS = [
  {
    name: 'fill_text',
    description: 'Type a value into a text input, textarea, or contenteditable element.',
    input_schema: {
      type: 'object',
      properties: {
        element_index: { type: 'integer', description: 'Index from the last read_form call' },
        value: { type: 'string', description: 'The text value to fill' },
      },
      required: ['element_index', 'value'],
    },
  },
  {
    name: 'select_option',
    description: 'Choose an option from a <select> dropdown by its visible label text.',
    input_schema: {
      type: 'object',
      properties: {
        element_index: { type: 'integer', description: 'Index of the select element' },
        option_label: { type: 'string', description: 'Visible text of the option to select' },
      },
      required: ['element_index', 'option_label'],
    },
  },
  {
    name: 'set_checkbox',
    description: 'Set a checkbox or radio button to checked or unchecked.',
    input_schema: {
      type: 'object',
      properties: {
        element_index: { type: 'integer', description: 'Index of the checkbox or radio element' },
        checked: { type: 'boolean', description: 'True to check, false to uncheck' },
      },
      required: ['element_index', 'checked'],
    },
  },
  {
    name: 'read_field',
    description: 'Read the current value or checked state of a specific form field on the page.',
    input_schema: {
      type: 'object',
      properties: {
        element_index: { type: 'integer', description: 'Index of the element to inspect' },
      },
      required: ['element_index'],
    },
  },
  {
    name: 'verify_field',
    description:
      "Re-read one field's current on-page value and compare it against the intended " +
      'source value. Use this after filling a field to confirm it took correctly, ' +
      'especially for dropdowns and checkboxes where a mismatch is easy to miss.',
    input_schema: {
      type: 'object',
      properties: {
        element_index: { type: 'integer', description: 'Index of the element to verify' },
        expected_value: { type: 'string', description: 'The expected source document value' },
      },
      required: ['element_index', 'expected_value'],
    },
  },
];

module.exports = { FORM_TOOLS };
