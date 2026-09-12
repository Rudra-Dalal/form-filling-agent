/**
 * Tool definitions for user interaction, clarification, and task completion.
 */

const USER_TOOLS = [
  {
    name: 'ask_user',
    description:
      'Pause and ask the human a question instead of guessing. Use this whenever a ' +
      'document value is missing, ambiguous, conflicting, or you are not confident which ' +
      'form field it belongs to. Always prefer this over guessing.',
    input_schema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'The specific question to ask the user' },
        context: { type: 'string', description: 'Why you are asking, briefly' },
      },
      required: ['question'],
    },
  },
  {
    name: 'request_takeover',
    description:
      'Request the human user to take control of the browser (e.g. for solving CAPTCHAs or security checks).',
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Explanation of why takeover is required' },
      },
      required: ['reason'],
    },
  },
  {
    name: 'task_complete',
    description:
      'Call this once every mapped field has been filled and verified. Provide a summary ' +
      'of what was filled and any fields intentionally left blank, for the user to review ' +
      'before they submit the form themselves. This tool never submits the form.',
    input_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'Summary of filled and verified fields' },
      },
      required: ['summary'],
    },
  },
];

module.exports = { USER_TOOLS };
