const { contextBridge, ipcRenderer } = require('electron');
const { IPC_CHANNELS } = require('../src/shared/events');

/**
 * Secure bridge exposing only explicitly permitted capabilities to the renderer.
 * Context isolation is enabled and Node.js access is completely blocked.
 */
const api = {
  // Document capabilities
  pickAndParseDocument: () => ipcRenderer.invoke(IPC_CHANNELS.DOC_PICK_AND_PARSE),

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

  // Streamed progress events listener
  onAgentEvent: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on(IPC_CHANNELS.AGENT_EVENT, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.AGENT_EVENT, handler);
  },
};

// Expose on both window.agentAPI (existing) and window.eigiAgent (target EIGI spec)
contextBridge.exposeInMainWorld('agentAPI', api);
contextBridge.exposeInMainWorld('eigiAgent', api);
