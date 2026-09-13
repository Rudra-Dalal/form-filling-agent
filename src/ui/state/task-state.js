// A deliberately tiny pub/sub store - no framework or bundler needed for
// this UI's complexity. Loaded as a native ES module (script type="module"),
// which Chromium's renderer supports directly even with nodeIntegration off.
//
// Components call subscribe() to re-render on any state change, and the app
// coordinator calls setState() to merge partial updates in from IPC events.

export function createStore(initialState) {
  let state = { ...initialState };
  const listeners = new Set();

  return {
    getState: () => state,
    setState(partial) {
      state = { ...state, ...partial };
      listeners.forEach((listener) => listener(state));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const taskState = createStore({
  // document
  documentFile: null, // { name, size }
  extraction: null, // { fields: [...], warnings: [...] }
  extractionInProgress: false,

  // task config
  targetUrl: '',
  instruction: '',

  // agent lifecycle
  agentStatus: 'idle', // idle | running | paused | waiting-for-input | complete | error
  isTakenOver: false,
  startedAt: null,

  // live log
  logEntries: [], // { type, message, timestamp }

  // ask-user
  pendingPrompt: null, // { promptId, question, context }

  // completion
  completionSummary: null, // { filled: [...], skipped: [{field, reason}] }
});
