import { taskState } from './state/task-state.js';
import { initDocumentUpload } from './components/document-upload.js';
import { initTaskInput } from './components/task-input.js';
import { initAgentStatus } from './components/agent-status.js';
import { initControls } from './components/controls.js';
import { initActivityLog } from './components/activity-log.js';

function pushLog(entry) {
  const state = taskState.getState();
  taskState.setState({
    logEntries: [...state.logEntries, { ...entry, timestamp: Date.now() }],
  });
}

// Maps the agent's raw event names (see src/shared/events.js on the main
// process side) to the log-entry "type" this UI knows how to style.
function mapEventToLogEntry(evt) {
  switch (evt.type) {
    case 'agent-thought':
      return { type: 'agent-thought', message: evt.text };
    case 'tool-call':
      return { type: 'tool-call', message: `${evt.name}(${JSON.stringify(evt.input)})` };
    case 'verify-result':
      return evt.matches
        ? { type: 'verify-ok', message: `Verified field ${evt.elementIndex}: "${evt.actual}"` }
        : {
            type: 'verify-mismatch',
            message: `Field ${evt.elementIndex} mismatch — expected "${evt.expected}", got "${evt.actual}"`,
          };
    case 'status':
      return { type: 'status', message: evt.message };
    case 'tool-error':
    case 'error':
      return { type: 'error', message: evt.message || `${evt.name} failed` };
    default:
      return null;
  }
}

function initApp() {
  initDocumentUpload(document.getElementById('document-upload-card'));

  initTaskInput(document.getElementById('task-input-card'), {
    onStart: async ({ targetUrl, instruction }) => {
      const state = taskState.getState();
      taskState.setState({
        agentStatus: 'running',
        startedAt: Date.now(),
        logEntries: [],
        completionSummary: null,
      });

      const res = await window.agentAPI.startAgent({
        documentData: state.extraction,
        targetUrl,
        instruction,
      });

      if (!res.ok) {
        taskState.setState({ agentStatus: 'error' });
        pushLog({ type: 'error', message: res.error || 'Could not start agent.' });
      }
    },
  });

  initAgentStatus(document.getElementById('agent-status-card'));
  initControls(document.getElementById('controls-card'));
  initActivityLog(document.getElementById('activity-log-card'));

  window.agentAPI.onAgentEvent((evt) => {
    switch (evt.type) {
      case 'paused':
        taskState.setState({ agentStatus: 'paused' });
        break;
      case 'resumed':
        taskState.setState({ agentStatus: 'running' });
        break;
      case 'handed-over':
        taskState.setState({ isTakenOver: true });
        pushLog({ type: 'status', message: evt.message });
        break;
      case 'resumed-from-user':
        taskState.setState({ isTakenOver: false });
        break;
      case 'ask-user':
        taskState.setState({
          agentStatus: 'waiting-for-input',
          pendingPrompt: { promptId: evt.promptId, question: evt.question, context: evt.context },
        });
        break;
      case 'complete':
        taskState.setState({
          agentStatus: 'complete',
          // evt.summary is a free-text string from the agent; a richer
          // structured {filled, skipped} shape can replace this once the
          // agent layer emits one - falling back to a single bucket here
          // keeps the UI functional either way.
          completionSummary: evt.filled
            ? { filled: evt.filled, skipped: evt.skipped || [] }
            : { filled: [evt.summary], skipped: [] },
        });
        break;
      default:
        break;
    }

    const logEntry = mapEventToLogEntry(evt);
    if (logEntry) pushLog(logEntry);
  });
}

document.addEventListener('DOMContentLoaded', initApp);
