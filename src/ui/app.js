/**
 * UI bootstrap coordinator. Connects state, components, and the Electron IPC bridge.
 */

document.addEventListener('DOMContentLoaded', () => {
  const api = window.agentAPI || window.eigiAgent;
  if (!api) {
    console.error('Agent API not available on window. Ensure preload script is loaded.');
    return;
  }

  const state = window.taskState;

  // Initialize Activity Log
  const { appendLog } = window.initActivityLog();

  // Initialize UI Components
  window.initAgentStatus({ state });
  window.initDocumentUpload({ state, api, onLog: (msg) => appendLog(msg, 'info') });
  window.initTaskInput({ state, api, onLog: (msg) => appendLog(msg, 'info') });
  window.initControls({ state, api, onLog: (msg) => appendLog(msg, 'info') });

  // Stream Agent events from Electron IPC bridge
  api.onAgentEvent((evt) => {
    switch (evt.type) {
      case 'status':
        state.setState({ statusMessage: evt.message });
        appendLog(evt.message, 'info');
        break;

      case 'agent-thought':
        appendLog(`🤔 ${evt.text}`, 'thought');
        break;

      case 'tool-call':
        appendLog(`→ ${evt.name}(${JSON.stringify(evt.input || {})})`, 'tool');
        break;

      case 'tool-error':
        appendLog(`✖ ${evt.name} failed: ${evt.message}`, 'error');
        break;

      case 'form-snapshot':
        appendLog(`Read form: ${evt.snapshot ? evt.snapshot.length : 0} interactive elements found.`, 'info');
        break;

      case 'verify-result':
        if (evt.matches) {
          appendLog(`✔ Field ${evt.elementIndex} verified: "${evt.actual}"`, 'verify-success');
        } else {
          appendLog(
            `⚠ Field ${evt.elementIndex} mismatch — expected "${evt.expected}", got "${evt.actual}"`,
            'verify-mismatch'
          );
        }
        break;

      case 'ask-user':
        state.setState({
          pendingPromptId: evt.promptId,
          pendingQuestion: evt.question,
          pendingContext: evt.context,
          agentStatus: 'waiting_for_user',
          statusMessage: 'Waiting for your answer...',
        });
        appendLog(`❓ Agent requires clarification: ${evt.question}`, 'prompt');
        break;

      case 'paused':
        state.setState({
          isPaused: true,
          agentStatus: 'paused',
          statusMessage: 'Agent paused.',
        });
        appendLog('⏸ Agent paused.', 'info');
        break;

      case 'resumed':
        state.setState({
          isPaused: false,
          agentStatus: 'running',
          statusMessage: 'Agent running...',
        });
        appendLog('▶ Agent resumed.', 'info');
        break;

      case 'handed-over':
        state.setState({
          isTakeover: true,
          agentStatus: 'human_takeover',
          statusMessage: 'Human takeover active.',
        });
        appendLog(`🖐 ${evt.message}`, 'info');
        break;

      case 'complete':
        state.setState({
          agentStatus: 'completed',
          statusMessage: 'Form completed and verified. Ready for human review.',
        });
        const reviewSec = document.getElementById('review-section');
        const reviewSum = document.getElementById('review-summary');
        if (reviewSec) reviewSec.hidden = false;
        if (reviewSum) reviewSum.textContent = evt.summary || 'All fields filled and verified.';
        appendLog(`✅ Done: ${evt.summary}`, 'complete');
        break;

      case 'error':
        state.setState({
          agentStatus: 'error',
          statusMessage: evt.message,
        });
        appendLog(`✖ Error: ${evt.message}`, 'error');
        break;

      default:
        appendLog(JSON.stringify(evt), 'info');
    }
  });

  appendLog('System initialized. Ready for task configuration.', 'info');
});
