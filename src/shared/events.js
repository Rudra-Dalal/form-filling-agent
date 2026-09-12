/**
 * Centralized event constants used across Agent, IPC, and UI layers.
 * Prevents string duplication and enforces consistent communication.
 */

const AGENT_EVENTS = {
  // Lifecycle events
  STARTED: 'agent:started',
  STATUS: 'status',
  THOUGHT: 'agent-thought',
  PAUSED: 'paused',
  RESUMED: 'resumed',
  WAITING_FOR_USER: 'agent:waiting-for-user',
  HANDED_OVER: 'handed-over',
  COMPLETED: 'complete',
  ERROR: 'error',

  // Tool & browser execution events
  TOOL_CALL: 'tool-call',
  TOOL_ERROR: 'tool-error',
  FORM_SNAPSHOT: 'form-snapshot',
  FIELD_FILLED: 'agent:field-filled',
  FIELD_VERIFIED: 'verify-result',

  // User collaboration events
  ASK_USER: 'ask-user',
  USER_ANSWERED: 'agent:user-answered',
};

const DOC_EVENTS = {
  PARSED: 'doc:parsed',
  PARSE_ERROR: 'doc:parse-error',
};

const IPC_CHANNELS = {
  // Renderer to Main invocations
  DOC_PICK_AND_PARSE: 'doc:pick-and-parse',
  AGENT_START: 'agent:start',
  AGENT_PAUSE: 'agent:pause',
  AGENT_RESUME: 'agent:resume',
  AGENT_TAKEOVER: 'agent:take-over',
  AGENT_GIVE_BACK: 'agent:give-back',
  AGENT_ANSWER: 'agent:answer',
  BROWSER_SNAPSHOT: 'browser:snapshot',

  // Main to Renderer event stream
  AGENT_EVENT: 'agent:event',
};

module.exports = {
  AGENT_EVENTS,
  DOC_EVENTS,
  IPC_CHANNELS,
};
