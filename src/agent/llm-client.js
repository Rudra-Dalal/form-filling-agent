const Anthropic = require('@anthropic-ai/sdk');

let client = null;

function getLLMClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        'ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key before starting the app.'
      );
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

/** Test-only escape hatch to inject a mock client without env vars. */
function _setLLMClientForTests(mockClient) {
  client = mockClient;
}

module.exports = { getLLMClient, _setLLMClientForTests };
