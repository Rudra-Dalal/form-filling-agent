const { contextBridge, ipcRenderer } = require('electron');

console.log('[PRELOAD] Running preload script...');

const IPC_CHANNELS = {
  DOC_PICK_AND_PARSE: 'doc:pick-and-parse',
  AGENT_START: 'agent:start',
  AGENT_PAUSE: 'agent:pause',
  AGENT_RESUME: 'agent:resume',
  AGENT_TAKEOVER: 'agent:take-over',
  AGENT_GIVE_BACK: 'agent:give-back',
  AGENT_ANSWER: 'agent:answer',
  AGENT_EVENT: 'agent:event',
  BROWSER_SNAPSHOT: 'browser:snapshot',
};

/**
 * Secure bridge exposing only explicitly permitted capabilities to the renderer.
 * Context isolation is enabled and Node.js access is completely blocked.
 */
const api = {
  // Document capabilities
  pickAndParseDocument: (opts) => ipcRenderer.invoke(IPC_CHANNELS.DOC_PICK_AND_PARSE, opts),
  selectDocument: (opts) => ipcRenderer.invoke(IPC_CHANNELS.DOC_PICK_AND_PARSE, opts),

  // Agent task lifecycle controls
  startAgent: (payload) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_START, payload),
  pauseAgent: () => ipcRenderer.invoke(IPC_CHANNELS.AGENT_PAUSE),
  resumeAgent: () => ipcRenderer.invoke(IPC_CHANNELS.AGENT_RESUME),
  takeOver: () => ipcRenderer.invoke(IPC_CHANNELS.AGENT_TAKEOVER),
  giveBack: () => ipcRenderer.invoke(IPC_CHANNELS.AGENT_GIVE_BACK),
  answerPrompt: (promptId, answer) =>
    ipcRenderer.invoke(IPC_CHANNELS.AGENT_ANSWER, { promptId, answer }),

  // Browser state query
  getBrowserSnapshot: () => ipcRenderer.invoke(IPC_CHANNELS.BROWSER_SNAPSHOT),
  getBrowserDomValues: () => ipcRenderer.invoke('browser:dom-values'),

  // Streamed progress events listener
  onAgentEvent: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on(IPC_CHANNELS.AGENT_EVENT, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.AGENT_EVENT, handler);
  },
};

try {
  // Expose on window.agentAPI, window.eigiAgent, and window.electronAPI
  contextBridge.exposeInMainWorld('agentAPI', api);
  contextBridge.exposeInMainWorld('eigiAgent', api);
  contextBridge.exposeInMainWorld('electronAPI', api);
  console.log('[PRELOAD] Successfully exposed bridges in main world.');
} catch (err) {
  console.error('[PRELOAD] Failed to expose bridge:', err);
}

