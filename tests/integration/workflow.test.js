const test = require('node:test');
const assert = require('node:assert/strict');
const { AgentSession } = require('../../src/agent/agent');
const { AGENT_STATES } = require('../../src/shared/constants');

test('Integration - AgentSession lifecycle, pause, resume, takeover, and ask_user flow', async () => {
  const eventsReceived = [];

  // Mock LLM client that sequentially returns canned tool calls
  let callCount = 0;
  const mockLLM = {
    messages: {
      create: async () => {
        callCount++;
        if (callCount === 1) {
          return {
            content: [
              { type: 'text', text: 'Inspecting the form on the page.' },
              { type: 'tool_use', id: 'call-1', name: 'read_form', input: {} },
            ],
          };
        }
        if (callCount === 2) {
          return {
            content: [
              {
                type: 'tool_use',
                id: 'call-2',
                name: 'fill_text',
                input: { element_index: 0, value: 'Rahul Sharma' },
              },
            ],
          };
        }
        if (callCount === 3) {
          return {
            content: [
              {
                type: 'tool_use',
                id: 'call-3',
                name: 'verify_field',
                input: { element_index: 0, expected_value: 'Rahul Sharma' },
              },
            ],
          };
        }
        if (callCount === 4) {
          return {
            content: [
              {
                type: 'tool_use',
                id: 'call-4',
                name: 'ask_user',
                input: { question: 'Which section: A or B?', context: 'Section ambiguous in document' },
              },
            ],
          };
        }
        return {
          content: [
            {
              type: 'tool_use',
              id: 'call-5',
              name: 'task_complete',
              input: { summary: 'Filled Student Name (Rahul Sharma) and Section. Ready for review.' },
            },
          ],
        };
      },
    },
  };

  const session = new AgentSession({
    documentData: { student: { fullName: 'Rahul Sharma' } },
    targetUrl: 'https://school.example/register',
    instruction: 'Fill registration form',
    onEvent: (evt) => eventsReceived.push(evt),
    llmClient: mockLLM,
  });

  // Mock browserSession primitives so Playwright doesn't require a real display in CI
  session.browserSession.launch = async () => {};
  session.browserSession.readForm = async () => [
    { index: 0, tag: 'input', type: 'text', label: 'Student Name', currentValue: 'Rahul Sharma' },
  ];
  session.browserSession.fillText = async () => {};
  session.browserSession.verifyField = async (_idx, expected) => ({
    matches: true,
    actual: expected,
  });

  // Start session run in background
  const runPromise = session.run();

  // Test Pause / Resume
  session.pause();
  assert.equal(session.state, AGENT_STATES.PAUSED);
  session.resume();
  assert.equal(session.state, AGENT_STATES.RUNNING);

  // Test Takeover / Give-back
  await session.handOverToUser('Solving test captcha');
  assert.equal(session.state, AGENT_STATES.HUMAN_TAKEOVER);
  await session.resumeFromUser();
  assert.equal(session.state, AGENT_STATES.RUNNING);

  // Wait until ask_user prompt is triggered
  const startTime = Date.now();
  while (!eventsReceived.some((e) => e.type === 'ask-user') && Date.now() - startTime < 3000) {
    await new Promise((r) => setTimeout(r, 10));
  }

  const askUserEvent = eventsReceived.find((e) => e.type === 'ask-user');
  assert.ok(askUserEvent, 'ask-user event must be emitted');
  assert.equal(session.state, AGENT_STATES.WAITING_FOR_USER);

  // Provide answer to resume agent loop
  session.provideUserAnswer(askUserEvent.promptId, 'Section A');

  // Await task completion
  await runPromise;

  assert.equal(session.state, AGENT_STATES.COMPLETED);

  const completeEvent = eventsReceived.find((e) => e.type === 'complete');
  assert.ok(completeEvent, 'task_complete event must be emitted');
  assert.ok(completeEvent.summary.includes('Rahul Sharma'));

  // Ensure no submit tool was ever called
  const toolCalls = eventsReceived.filter((e) => e.type === 'tool-call');
  const toolNames = toolCalls.map((c) => c.name);
  assert.equal(toolNames.includes('submit_form'), false);
});
