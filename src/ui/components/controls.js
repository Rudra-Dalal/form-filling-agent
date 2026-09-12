/**
 * Controls component managing pause/resume, takeover/give-back, and user prompt answering.
 */

function initControls({ state, api, onLog }) {
  const controlsSection = document.getElementById('controls-section');
  const pauseBtn = document.getElementById('pause-btn');
  const resumeBtn = document.getElementById('resume-btn');
  const takeOverBtn = document.getElementById('take-over-btn');
  const giveBackBtn = document.getElementById('give-back-btn');

  const askUserSection = document.getElementById('ask-user-section');
  const askUserQuestion = document.getElementById('ask-user-question');
  const askUserAnswer = document.getElementById('ask-user-answer');
  const askUserSubmit = document.getElementById('ask-user-submit');

  pauseBtn.addEventListener('click', async () => {
    await api.pauseAgent();
    state.setState({ isPaused: true, agentStatus: 'paused', statusMessage: 'Agent paused by user.' });
    onLog('Agent paused.');
  });

  resumeBtn.addEventListener('click', async () => {
    await api.resumeAgent();
    state.setState({ isPaused: false, agentStatus: 'running', statusMessage: 'Agent resumed.' });
    onLog('Agent resumed.');
  });

  takeOverBtn.addEventListener('click', async () => {
    await api.takeOver();
    state.setState({
      isTakeover: true,
      agentStatus: 'human_takeover',
      statusMessage: 'You have control of the browser.',
    });
    onLog('Human takeover enabled. You may interact directly with the browser.');
  });

  giveBackBtn.addEventListener('click', async () => {
    await api.giveBack();
    state.setState({
      isTakeover: false,
      agentStatus: 'running',
      statusMessage: 'Agent resumed control.',
    });
    onLog('Control handed back to the agent.');
  });

  askUserSubmit.addEventListener('click', async () => {
    const answer = askUserAnswer.value.trim();
    const { pendingPromptId } = state.getState();
    if (!pendingPromptId || !answer) return;

    await api.answerPrompt(pendingPromptId, answer);
    onLog(`Sent answer to agent: "${answer}"`);

    state.setState({
      pendingPromptId: null,
      pendingQuestion: '',
      agentStatus: 'running',
      statusMessage: 'Processing answer...',
    });

    askUserSection.hidden = true;
    askUserAnswer.value = '';
  });

  // State subscription to update button states
  state.subscribe((current) => {
    const isRunning = ['running', 'paused', 'waiting_for_user', 'human_takeover'].includes(
      current.agentStatus
    );
    controlsSection.hidden = !isRunning;

    pauseBtn.disabled = current.isPaused || current.isTakeover;
    resumeBtn.disabled = !current.isPaused || current.isTakeover;

    takeOverBtn.disabled = current.isTakeover;
    giveBackBtn.disabled = !current.isTakeover;

    if (current.pendingPromptId) {
      askUserSection.hidden = false;
      askUserQuestion.textContent = current.pendingContext
        ? `${current.pendingQuestion} (${current.pendingContext})`
        : current.pendingQuestion;
      askUserAnswer.focus();
    } else {
      askUserSection.hidden = true;
    }
  });
}

if (typeof window !== 'undefined') {
  window.initControls = initControls;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initControls };
}
