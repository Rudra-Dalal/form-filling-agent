const test = require('node:test');
const assert = require('node:assert/strict');
const { ALL_TOOLS } = require('../../src/agent/tools');
const { DOCUMENT_TOOLS } = require('../../src/agent/tools/document.tools');
const { BROWSER_TOOLS } = require('../../src/agent/tools/browser.tools');
const { FORM_TOOLS } = require('../../src/agent/tools/form.tools');
const { USER_TOOLS } = require('../../src/agent/tools/user.tools');
const { SYSTEM_PROMPT } = require('../../src/agent/prompts/system.prompt');
const { validateAgentAction } = require('../../src/agent/schemas/agent.schema');

test('Agent Layer - Tool definitions contain all required Phase 1 tools', () => {
  const toolNames = ALL_TOOLS.map((t) => t.name);

  // Browser & Form tools
  assert.ok(toolNames.includes('read_form'), 'read_form must exist');
  assert.ok(toolNames.includes('fill_text'), 'fill_text must exist');
  assert.ok(toolNames.includes('select_option'), 'select_option must exist');
  assert.ok(toolNames.includes('set_checkbox'), 'set_checkbox must exist');
  assert.ok(toolNames.includes('verify_field'), 'verify_field must exist');

  // User tools
  assert.ok(toolNames.includes('ask_user'), 'ask_user must exist');
  assert.ok(toolNames.includes('task_complete'), 'task_complete must exist');

  // Document tools
  assert.ok(toolNames.includes('read_document'), 'read_document must exist');
});

test('Agent Layer - STRICT Phase 1 Boundary: submit_form tool MUST NOT exist', () => {
  const allToolNames = ALL_TOOLS.map((t) => t.name.toLowerCase());
  assert.equal(
    allToolNames.includes('submit_form'),
    false,
    'CRITICAL: submit_form must NOT exist in the agent toolset'
  );

  const formToolNames = FORM_TOOLS.map((t) => t.name.toLowerCase());
  assert.equal(
    formToolNames.includes('submit_form'),
    false,
    'CRITICAL: submit_form must NOT exist in form tools'
  );

  const browserToolNames = BROWSER_TOOLS.map((t) => t.name.toLowerCase());
  assert.equal(
    browserToolNames.includes('submit_form'),
    false,
    'CRITICAL: submit_form must NOT exist in browser tools'
  );
});

test('Agent Layer - System prompt strictly specifies Phase 1 boundaries', () => {
  assert.ok(
    SYSTEM_PROMPT.includes('NEVER ATTEMPT TO SUBMIT THE FORM'),
    'System prompt must strictly forbid form submission'
  );
  assert.ok(
    SYSTEM_PROMPT.includes('DO NOT GUESS'),
    'System prompt must forbid guessing missing values'
  );
  assert.ok(
    SYSTEM_PROMPT.includes('ask_user'),
    'System prompt must mandate asking user for ambiguous/missing data'
  );
  assert.ok(
    SYSTEM_PROMPT.includes('VERIFY every field'),
    'System prompt must mandate field verification'
  );
});

test('Agent Layer - Action schema validates correctly', () => {
  const valid = validateAgentAction({ action: 'fill_text', target: 2, value: 'John' });
  assert.equal(valid.valid, true);

  const invalid = validateAgentAction({});
  assert.equal(invalid.valid, false);
});
