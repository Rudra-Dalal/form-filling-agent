/**
 * Target form URL and user instruction input component.
 */

function initTaskInput({ state, api, onLog }) {
  const targetUrlInput = document.getElementById('target-url');
  const instructionInput = document.getElementById('instruction');
  const startBtn = document.getElementById('start-btn');

  function updateStartButtonState() {
    startBtn.disabled = !state.canStart();
  }

  targetUrlInput.addEventListener('input', (e) => {
    state.setState({ targetUrl: e.target.value.trim() });
  });

  instructionInput.addEventListener('input', (e) => {
    state.setState({ instruction: e.target.value.trim() });
  });

  state.subscribe(() => {
    updateStartButtonState();
  });

  startBtn.addEventListener('click', async () => {
    const currentState = state.getState();

    if (!currentState.documentData || !currentState.targetUrl || !currentState.instruction) {
      onLog('Please select a document, enter a target URL, and an instruction.');
      return;
    }

    startBtn.disabled = true;
    state.setState({
      agentStatus: 'running',
      statusMessage: 'Starting agent...',
    });

    onLog(`Initiating form-filling task for: ${currentState.targetUrl}`);

    const res = await api.startAgent({
      documentData: currentState.documentData,
      targetUrl: currentState.targetUrl,
      instruction: currentState.instruction,
    });

    if (!res.ok) {
      onLog(`Could not start: ${res.error}`);
      state.setState({
        agentStatus: 'error',
        statusMessage: res.error,
      });
      startBtn.disabled = false;
    } else {
      onLog('Agent started. Visible browser window should open shortly.');
    }
  });
}

if (typeof window !== 'undefined') {
  window.initTaskInput = initTaskInput;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initTaskInput };
}
