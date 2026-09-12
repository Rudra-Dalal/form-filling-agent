const Anthropic = require('@anthropic-ai/sdk');
const { AgentError } = require('../shared/errors');

let clientInstance = null;

/**
 * Returns a configured Anthropic client singleton.
 * @returns {Anthropic}
 */
function getLLMClient() {
  if (!clientInstance) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new AgentError(
        'ANTHROPIC_API_KEY is not set. Add it to your environment before starting the app.'
      );
    }
    clientInstance = new Anthropic({ apiKey });
  }
  return clientInstance;
}

/**
 * Overrides the LLM client instance (useful for unit and integration testing).
 * @param {any} mockClient
 */
function setLLMClient(mockClient) {
  clientInstance = mockClient;
}

module.exports = {
  getLLMClient,
  setLLMClient,
};
