const { ipcMain } = require('electron');
const { getActiveSession } = require('./agent.ipc');
const { IPC_CHANNELS } = require('../../src/shared/events');

function registerBrowserIpc() {
  ipcMain.handle(IPC_CHANNELS.BROWSER_SNAPSHOT, async () => {
    const session = getActiveSession();
    if (!session || !session.browserSession) {
      return { ok: false, error: 'No active browser session.' };
    }
    try {
      const snapshot = await session.browserSession.readForm();
      return { ok: true, snapshot };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });
}

module.exports = { registerBrowserIpc };
