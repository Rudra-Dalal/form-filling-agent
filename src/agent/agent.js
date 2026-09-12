const { getLLMClient } = require('./llm-client');
const { ALL_TOOLS } = require('./tools');
const { SYSTEM_PROMPT } = require('./prompts/system.prompt');
const { buildInitialTaskPrompt } = require('./prompts/form-filling.prompt');
const { BrowserSession } = require('../browser/browser');
const { ToolExecutor } = require('./executor');
const { AgentPlanner } = require('./planner');
const { FormVerifier } = require('./verifier');
const { AGENT_EVENTS } = require('../shared/events');
const { AGENT_STATES, MAX_AGENT_ITERATIONS, DEFAULT_LLM_MODEL, MAX_PROMPT_TOKENS } = require('../shared/constants');

class AgentSession {
  /**
   * @param {Object} config
   * @param {Object} config.documentData - Structured student document data
   * @param {string} config.targetUrl - Form target URL
   * @param {string} config.instruction - User task instruction
   * @param {Function} [config.onEvent] - Callback for streaming events to UI
   * @param {any} [config.llmClient] - Optional LLM client instance (for testing/mocking)
   */
  constructor({ documentData, targetUrl, instruction, onEvent, llmClient }) {
    this.documentData = documentData || {};
    this.targetUrl = targetUrl;
    this.instruction = instruction;
    this.onEvent = onEvent || (() => {});

    this.browserSession = new BrowserSession();
    this.client = llmClient || getLLMClient();

    this.planner = new AgentPlanner(this.documentData);
    this.verifier = new FormVerifier();

    this.state = AGENT_STATES.IDLE;
    this._pauseWaiters = [];

    this._pendingPrompts = new Map(); // promptId -> { resolve }
    this._promptCounter = 0;

    this.messages = [];

    this.executor = new ToolExecutor({
      browserSession: this.browserSession,
      verifier: this.verifier,
      planner: this.planner,
      emit: this.emit.bind(this),
      askUser: this._askUser.bind(this),
      handOverToUser: this.handOverToUser.bind(this),
      documentData: this.documentData,
    });
  }

  emit(type, data = {}) {
    this.onEvent({ type, ...data });
  }

  // ---- pause / resume ----

  pause() {
    this.state = AGENT_STATES.PAUSED;
    this.emit(AGENT_EVENTS.PAUSED);
  }

  resume() {
    this.state = AGENT_STATES.RUNNING;
    this.emit(AGENT_EVENTS.RESUMED);
    this._pauseWaiters.forEach((resolve) => resolve());
    this._pauseWaiters = [];
  }

  async _waitIfPaused() {
    if (this.state === AGENT_STATES.PAUSED || this.state === AGENT_STATES.HUMAN_TAKEOVER) {
      await new Promise((resolve) => this._pauseWaiters.push(resolve));
    }
  }

  // ---- human take-over ----

  async handOverToUser(reason = '') {
    this.state = AGENT_STATES.HUMAN_TAKEOVER;
    this.emit(AGENT_EVENTS.HANDED_OVER, {
      message: reason || 'You have control of the browser. Make your changes, then hand control back.',
    });
  }

  async resumeFromUser() {
    // Re-read the form so the agent's next step reflects whatever the user modified
    try {
      const snapshot = await this.browserSession.readForm();
      this.emit(AGENT_EVENTS.FORM_SNAPSHOT, { snapshot, reason: 'resumed-from-user' });
    } catch (err) {
      this.emit(AGENT_EVENTS.STATUS, { message: `Resumed from user. (Form re-read note: ${err.message})` });
    }
    this.resume();
  }

  // ---- ask_user plumbing ----

  provideUserAnswer(promptId, answer) {
    const pending = this._pendingPrompts.get(promptId);
    if (pending) {
      this.state = AGENT_STATES.RUNNING;
      this.emit(AGENT_EVENTS.USER_ANSWERED, { promptId, answer });
      pending.resolve(answer);
      this._pendingPrompts.delete(promptId);
    }
  }

  _askUser(question, context) {
    this.state = AGENT_STATES.WAITING_FOR_USER;
    const promptId = `prompt-${++this._promptCounter}`;
    this.emit(AGENT_EVENTS.ASK_USER, { promptId, question, context });
    return new Promise((resolve) => {
      this._pendingPrompts.set(promptId, { resolve });
    });
  }

  // ---- main agent loop ----

  async run() {
    this.state = AGENT_STATES.RUNNING;
    this.emit(AGENT_EVENTS.STATUS, { message: 'Launching browser...' });
    await this.browserSession.launch(this.targetUrl);

    this.messages.push({
      role: 'user',
      content: buildInitialTaskPrompt({
        instruction: this.instruction,
        targetUrl: this.targetUrl,
        documentData: this.documentData,
      }),
    });

    let done = false;
    let iterations = 0;

    while (!done && iterations < MAX_AGENT_ITERATIONS) {
      iterations += 1;
      await this._waitIfPaused();

      const response = await this.client.messages.create({
        model: DEFAULT_LLM_MODEL,
        max_tokens: MAX_PROMPT_TOKENS,
        system: SYSTEM_PROMPT,
        tools: ALL_TOOLS,
        messages: this.messages,
      });

      this.messages.push({ role: 'assistant', content: response.content });

      const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use');

      // Surface plain-text reasoning
      const textBlocks = response.content.filter((b) => b.type === 'text');
      textBlocks.forEach((b) => this.emit(AGENT_EVENTS.THOUGHT, { text: b.text }));

      if (toolUseBlocks.length === 0) {
        // No tool calls produced; agent finished or paused reasoning
        break;
      }

      const toolResults = [];
      for (const toolUse of toolUseBlocks) {
        await this._waitIfPaused();
        const result = await this.executor.execute(toolUse);
        if (toolUse.name === 'task_complete') {
          done = true;
          this.state = AGENT_STATES.COMPLETED;
        }
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }

      this.messages.push({ role: 'user', content: toolResults });
    }

    if (!done) {
      this.emit(AGENT_EVENTS.STATUS, { message: 'Stopped without an explicit completion signal.' });
    }

    // Leave the browser open for human review (never auto-submit)
    this.emit(AGENT_EVENTS.STATUS, { message: 'Form filled, verified, and ready for human review.' });
  }

  async close() {
    await this.browserSession.close();
  }
}

module.exports = { AgentSession };
