import { taskState } from '../state/task-state.js';

const STATUS_CONFIG = {
  idle: { label: 'Idle', pillClass: 'pill-neutral', pulsing: false },
  running: { label: 'Running', pillClass: 'pill-success', pulsing: true },
  paused: { label: 'Paused', pillClass: 'pill-warning', pulsing: false },
  'waiting-for-input': { label: 'Waiting for your input', pillClass: 'pill-warning', pulsing: true },
  complete: { label: 'Complete', pillClass: 'pill-success', pulsing: false },
  error: { label: 'Error', pillClass: 'pill-error', pulsing: false },
};

function formatElapsed(startedAt) {
  if (!startedAt) return '00:00s';
  const seconds = Math.floor((Date.now() - startedAt) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}s`;
}

export function initAgentStatus(container) {
  container.innerHTML = `
    <div class="status-bar">
      <div id="status-pill-area"></div>
      <div class="status-meta" id="status-meta-area"></div>
    </div>
  `;

  const pillArea = container.querySelector('#status-pill-area');
  const metaArea = container.querySelector('#status-meta-area');
  let tickInterval = null;

  function render(state) {
    const config = STATUS_CONFIG[state.agentStatus] || STATUS_CONFIG.idle;
    pillArea.innerHTML = `
      <span class="pill ${config.pillClass}">
        <span class="pill-dot ${config.pulsing ? 'pulsing' : ''}"></span>
        ${config.label}
      </span>
    `;

    const isActive = ['running', 'paused', 'waiting-for-input'].includes(state.agentStatus);
    metaArea.innerHTML = isActive
      ? `<span>Elapsed: ${formatElapsed(state.startedAt)}</span><span>Browser View: Connected</span>`
      : '';

    clearInterval(tickInterval);
    if (isActive) {
      tickInterval = setInterval(() => render(taskState.getState()), 1000);
    }
  }

  taskState.subscribe(render);
  render(taskState.getState());
}
