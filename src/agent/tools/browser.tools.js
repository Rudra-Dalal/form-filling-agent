/**
 * Tool definitions for browser inspection and navigation.
 */

const BROWSER_TOOLS = [
  {
    name: 'read_form',
    description:
      'Re-read the current state of the form on the page. Returns a numbered list of ' +
      'interactive elements (inputs, selects, checkboxes, buttons) with their labels and ' +
      'current values. Call this first, and again any time the page may have changed.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_page_snapshot',
    description: 'Get a snapshot of the current interactive elements on the page.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'click',
    description: 'Click an element by its numbered index (e.g. next step, tab, or accordion). NEVER use to submit forms.',
    input_schema: {
      type: 'object',
      properties: {
        element_index: { type: 'integer', description: 'Index from the last read_form call' },
      },
      required: ['element_index'],
    },
  },
];

module.exports = { BROWSER_TOOLS };
