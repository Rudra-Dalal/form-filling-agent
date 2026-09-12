const Anthropic = require('@anthropic-ai/sdk');

let client = null;

if (!process.env.ANTHROPIC_API_KEY && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch (_) {}
}

function hasLLMKey() {
  return Boolean(client || process.env.ANTHROPIC_API_KEY);
}

function setApiKey(apiKey) {
  if (apiKey && typeof apiKey === 'string') {
    process.env.ANTHROPIC_API_KEY = apiKey.trim();
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
}

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

function _resetLLMClientForTests() {
  client = null;
}

module.exports = {
  getLLMClient,
  hasLLMKey,
  setApiKey,
  _setLLMClientForTests,
  _resetLLMClientForTests,
};
