// Single source of truth for event/channel names so the renderer, main
// process, and agent never drift out of sync on string literals.

const AGENT_EVENTS = Object.freeze({
  STATUS: 'status',
  AGENT_THOUGHT: 'agent-thought',
  THOUGHT: 'agent-thought',
  TOOL_CALL: 'tool-call',
  TOOL_ERROR: 'tool-error',
  FORM_SNAPSHOT: 'form-snapshot',
  VERIFY_RESULT: 'verify-result',
  FIELD_VERIFIED: 'verify-result',
  FIELD_FILLED: 'agent:field-filled',
  ASK_USER: 'ask-user',
  PAUSED: 'paused',
  RESUMED: 'resumed',
  HANDED_OVER: 'handed-over',
  RESUMED_FROM_USER: 'resumed-from-user',
  COMPLETE: 'complete',
  COMPLETED: 'complete',
  ERROR: 'error',
  STARTED: 'agent:started',
  WAITING_FOR_USER: 'agent:waiting-for-user',
  USER_ANSWERED: 'agent:user-answered',
});

const IPC_CHANNELS = Object.freeze({
  DOC_PICK_AND_PARSE: 'doc:pick-and-parse',
  AGENT_START: 'agent:start',
  AGENT_PAUSE: 'agent:pause',
  AGENT_RESUME: 'agent:resume',
  AGENT_TAKE_OVER: 'agent:take-over',
  AGENT_TAKEOVER: 'agent:take-over',
  AGENT_GIVE_BACK: 'agent:give-back',
  AGENT_ANSWER: 'agent:answer',
  AGENT_EVENT: 'agent:event',
  BROWSER_SNAPSHOT: 'browser:snapshot',
});

const DOC_EVENTS = Object.freeze({
  PARSED: 'doc:parsed',
  PARSE_ERROR: 'doc:parse-error',
});

module.exports = { AGENT_EVENTS, IPC_CHANNELS, DOC_EVENTS };
