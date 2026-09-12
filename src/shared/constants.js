/**
 * Global configuration constants for form-filling-agent.
 */

module.exports = {
  // Agent configuration
  MAX_AGENT_ITERATIONS: 40,
  DEFAULT_LLM_MODEL: 'claude-sonnet-4-6',
  MAX_PROMPT_TOKENS: 1500,
  MAX_EXTRACTION_TOKENS: 2000,
  RAW_TEXT_MAX_LENGTH: 20000,

  // Browser configuration
  DEFAULT_NAV_TIMEOUT_MS: 30000,
  HEADLESS: false,

  // Supported document extensions
  SUPPORTED_DOC_EXTENSIONS: ['.pdf', '.docx', '.xlsx', '.xls'],

  // Agent task states
  AGENT_STATES: {
    IDLE: 'idle',
    RUNNING: 'running',
    PAUSED: 'paused',
    WAITING_FOR_USER: 'waiting_for_user',
    HUMAN_TAKEOVER: 'human_takeover',
    COMPLETED: 'completed',
    ERROR: 'error',
  },
};
