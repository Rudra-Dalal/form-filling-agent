/**
 * Real-time activity log component.
 */

function initActivityLog() {
  const logOutput = document.getElementById('log-output');

  function appendLog(message, category = 'info') {
    if (!logOutput) return;

    const line = document.createElement('div');
    line.className = `log-line log-${category}`;

    const timestamp = new Date().toLocaleTimeString();
    line.innerHTML = `<span class="log-time">[${timestamp}]</span> <span class="log-text">${escapeHtml(message)}</span>`;

    logOutput.appendChild(line);
    logOutput.scrollTop = logOutput.scrollHeight;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  return { appendLog };
}

if (typeof window !== 'undefined') {
  window.initActivityLog = initActivityLog;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initActivityLog };
}
