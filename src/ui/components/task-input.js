import { taskState } from '../state/task-state.js';

export function initTaskInput(container, { onStart }) {
  container.innerHTML = `
    <div class="step-label">Step 2</div>
    <h2>Target Form</h2>

    <div class="field">
      <label for="target-url-input">Target Form URL</label>
      <input id="target-url-input" type="text" placeholder="https://school-portal.example/register" />
    </div>

    <div class="field">
      <label for="instruction-input">Instruction</label>
      <textarea id="instruction-input" placeholder="Read this document and fill the student registration form."></textarea>
    </div>

    <button id="start-agent-btn" class="btn-primary" disabled>Start Agent</button>
    <div class="helper-text" id="start-helper">Upload a document and enter a target URL to begin.</div>
    <div><span class="protection-notice">🛡 Guaranteed zero automated submits without operator clearance</span></div>
  `;

  const urlInput = container.querySelector('#target-url-input');
  const instructionInput = container.querySelector('#instruction-input');
  const startBtn = container.querySelector('#start-agent-btn');
  const startHelper = container.querySelector('#start-helper');

  urlInput.addEventListener('input', () => taskState.setState({ targetUrl: urlInput.value }));
  instructionInput.addEventListener('input', () =>
    taskState.setState({ instruction: instructionInput.value })
  );

  startBtn.addEventListener('click', () => {
    const state = taskState.getState();
    onStart({ targetUrl: state.targetUrl.trim(), instruction: state.instruction.trim() });
  });

  function render(state) {
    const ready =
      Boolean(state.documentFile) && state.targetUrl.trim().length > 0 && state.instruction.trim().length > 0;
    const idle = state.agentStatus === 'idle';

    startBtn.disabled = !ready || !idle;
    startBtn.textContent = idle ? 'Start Agent' : 'Agent Active';
    startHelper.classList.toggle('hidden', ready);
  }

  taskState.subscribe(render);
  render(taskState.getState());
}
