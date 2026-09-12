const http = require('http');
const { ipcMain } = require('electron');
const { getActiveSession, getActiveBackendSessionId } = require('./agent.ipc');
const { IPC_CHANNELS } = require('../../src/shared/events');

async function fetchFromBackend(endpoint) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:8000${endpoint}`, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(body || '{}'));
        } catch {
          resolve({ ok: false });
        }
      });
    });
    req.on('error', (err) => reject(err));
    req.setTimeout(3000, () => {
      req.destroy();
      reject(new Error('Timeout querying backend'));
    });
  });
}

function registerBrowserIpc() {
  ipcMain.handle(IPC_CHANNELS.BROWSER_SNAPSHOT, async () => {
    const backendSessionId = getActiveBackendSessionId();
    if (backendSessionId) {
      try {
        const res = await fetchFromBackend(`/sessions/${backendSessionId}/snapshot`);
        return res;
      } catch (err) {
        return { ok: false, error: err.message };
      }
    }

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

  ipcMain.handle('browser:dom-values', async () => {
    const backendSessionId = getActiveBackendSessionId();
    if (backendSessionId) {
      try {
        const res = await fetchFromBackend(`/sessions/${backendSessionId}/dom-values`);
        return res;
      } catch (err) {
        return { ok: false, error: err.message };
      }
    }
    return { ok: false, error: 'No active backend session.' };
  });
}

module.exports = { registerBrowserIpc };
