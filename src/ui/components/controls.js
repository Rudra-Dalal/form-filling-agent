import { taskState } from '../state/task-state.js';

export function initControls(container) {
  container.innerHTML = `
    <div class="control-bar">
      <button id="pause-resume-btn" class="btn-secondary" disabled>Pause Agent</button>
      <button id="take-over-btn" class="btn-secondary" disabled>Take Over Browser</button>
      <span class="caption" id="control-caption"></span>
    </div>
    <div id="ask-user-area"></div>
  `;

  const pauseResumeBtn = container.querySelector('#pause-resume-btn');
  const takeOverBtn = container.querySelector('#take-over-btn');
  const caption = container.querySelector('#control-caption');
  const askUserArea = container.querySelector('#ask-user-area');

  pauseResumeBtn.addEventListener('click', async () => {
    const { agentStatus } = taskState.getState();
    if (agentStatus === 'paused') {
      await window.agentAPI.resumeAgent();
    } else {
      await window.agentAPI.pauseAgent();
    }
  });

  takeOverBtn.addEventListener('click', async () => {
    const { isTakenOver } = taskState.getState();
    if (isTakenOver) {
      await window.agentAPI.giveBack();
    } else {
      await window.agentAPI.takeOver();
    }
  });

  function renderAskUser(state) {
    const prompt = state.pendingPrompt;
    if (!prompt) {
      askUserArea.innerHTML = '';
      return;
    }

    // Offer quick-select chips when the context looks like an explicit
    // "option A vs option B" choice (best-effort heuristic on the context
    // string); otherwise just show the free-text input.
    const chipMatches = [...(prompt.context || '').matchAll(/\d\.\s*([^:|]+):/g)].map((m) => m[1].trim());

    askUserArea.innerHTML = `
      <div class="ask-user-card">
        <div class="heading">❓ Human Clarification Needed (Blocking Action)</div>
        <div class="question">${prompt.question}</div>
        ${prompt.context ? `<div class="context-pill">${prompt.context}</div>` : ''}
        ${
          chipMatches.length > 0
            ? `<div class="choice-chips">
                 ${chipMatches
                   .map((label) => `<button class="choice-chip" data-choice="${label}">${label}</button>`)
                   .join('')}
               </div>`
            : ''
        }
        <div class="answer-row">
          <input type="text" id="ask-user-answer-input" placeholder="Type your answer..." />
          <button class="btn-primary" id="ask-user-send-btn">Send Answer</button>
        </div>
      </div>
    `;

    const answerInput = askUserArea.querySelector('#ask-user-answer-input');

    askUserArea.querySelectorAll('.choice-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        answerInput.value = chip.dataset.choice;
      });
    });

    askUserArea.querySelector('#ask-user-send-btn').addEventListener('click', async () => {
      const answer = answerInput.value.trim();
      if (!answer) return;
      await window.agentAPI.answerPrompt(prompt.promptId, answer);
      taskState.setState({ pendingPrompt: null });
    });
  }

  function render(state) {
    const isActive = ['running', 'paused', 'waiting-for-input'].includes(state.agentStatus);
    pauseResumeBtn.disabled = !isActive || state.isTakenOver;
    pauseResumeBtn.textContent = state.agentStatus === 'paused' ? 'Resume Agent' : 'Pause Agent';

    takeOverBtn.disabled = !isActive;
    takeOverBtn.textContent = state.isTakenOver ? 'Give Control Back' : 'Take Over Browser';

    caption.textContent = state.isTakenOver
      ? 'You have control. Make your changes, then give control back.'
      : isActive
      ? "You will control the browser directly until you give control back."
      : '';

    renderAskUser(state);
  }

  taskState.subscribe(render);
  render(taskState.getState());
}
