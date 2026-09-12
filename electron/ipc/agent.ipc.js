const { ipcMain } = require('electron');
const { AgentSession } = require('../../src/agent/agent');
const { windowService } = require('../services/window.service');
const { IPC_CHANNELS, AGENT_EVENTS } = require('../../src/shared/events');

let activeSession = null;

function registerAgentIpc() {
  ipcMain.handle(IPC_CHANNELS.AGENT_START, async (_event, { documentData, targetUrl, instruction }) => {
    if (activeSession) {
      return { ok: false, error: 'A form-filling session is already running.' };
    }

    activeSession = new AgentSession({
      documentData,
      targetUrl,
      instruction,
      onEvent: (evt) => windowService.sendToRenderer(IPC_CHANNELS.AGENT_EVENT, evt),
    });

    // Run without awaiting so IPC returns immediately; progress streams over AGENT_EVENT
    activeSession
      .run()
      .catch((err) => {
        windowService.sendToRenderer(IPC_CHANNELS.AGENT_EVENT, {
          type: AGENT_EVENTS.ERROR,
          message: err.message,
        });
      })
      .finally(() => {
        activeSession = null;
      });

    return { ok: true };
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_PAUSE, async () => {
    if (!activeSession) return { ok: false, error: 'No active session.' };
    activeSession.pause();
    return { ok: true };
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_RESUME, async () => {
    if (!activeSession) return { ok: false, error: 'No active session.' };
    activeSession.resume();
    return { ok: true };
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_TAKEOVER, async () => {
    if (!activeSession) return { ok: false, error: 'No active session.' };
    await activeSession.handOverToUser();
    return { ok: true };
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_GIVE_BACK, async () => {
    if (!activeSession) return { ok: false, error: 'No active session.' };
    await activeSession.resumeFromUser();
    return { ok: true };
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_ANSWER, async (_event, { promptId, answer }) => {
    if (!activeSession) return { ok: false, error: 'No active session.' };
    activeSession.provideUserAnswer(promptId, answer);
    return { ok: true };
  });
}

function getActiveSession() {
  return activeSession;
}

module.exports = {
  registerAgentIpc,
  getActiveSession,
};
