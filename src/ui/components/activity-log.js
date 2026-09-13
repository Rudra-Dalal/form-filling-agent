import { taskState } from '../state/task-state.js';

const TYPE_TO_ICON = {
  'agent-thought': '💭',
  'tool-call': '→',
  'verify-ok': '✅',
  'verify-mismatch': '⚠️',
  'ask-user': '❓',
  status: 'ℹ️',
  error: '✖️',
};

const TYPE_TO_CLASS = {
  'verify-ok': 'verify-ok',
  'verify-mismatch': 'verify-mismatch',
  error: 'error',
};

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour12: false });
}

function renderLogEntry(entry) {
  const icon = TYPE_TO_ICON[entry.type] || '•';
  const cls = TYPE_TO_CLASS[entry.type] || '';
  return `
    <div class="log-entry ${cls}">
      <span class="icon">${icon}</span>
      <span class="timestamp">[${formatTime(entry.timestamp)}]</span>
      <span class="message">${entry.message}</span>
    </div>`;
}

function renderCompletionCard(summary) {
  const filledList = summary.filled.map((f) => `<li>${f}</li>`).join('') || '<li>None</li>';
  const skippedList =
    summary.skipped.map((s) => `<li>${s.field} — <em>${s.reason}</em></li>`).join('') ||
    '<li>None</li>';

  return `
    <div class="completion-card">
      <div class="heading">✅ Form filled and verified — ready for your review.</div>
      <div class="completion-columns">
        <div>
          <h4>Filled &amp; verified (${summary.filled.length})</h4>
          <ul>${filledList}</ul>
        </div>
        <div>
          <h4>Left blank — needs your input (${summary.skipped.length})</h4>
          <ul>${skippedList}</ul>
        </div>
      </div>
      <div class="completion-reassurance">
        Nothing has been submitted. Review the form in the browser window before proceeding manually.
      </div>
      <button class="btn-primary" style="margin-top:14px;" id="open-browser-preview-btn">
        Open Browser Preview
      </button>
    </div>
  `;
}

export function initActivityLog(container) {
  container.innerHTML = `
    <h2>Activity</h2>
    <div class="log-feed" id="log-feed"></div>
    <div id="completion-area"></div>
  `;

  const logFeed = container.querySelector('#log-feed');
  const completionArea = container.querySelector('#completion-area');

  function render(state) {
    logFeed.innerHTML = state.logEntries.map(renderLogEntry).join('');
    logFeed.scrollTop = logFeed.scrollHeight;

    completionArea.innerHTML = state.completionSummary
      ? renderCompletionCard(state.completionSummary)
      : '';
  }

  taskState.subscribe(render);
  render(taskState.getState());
}
