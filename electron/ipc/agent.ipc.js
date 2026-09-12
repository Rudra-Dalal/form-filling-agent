const { ipcMain } = require('electron');
const http = require('http');
const { AgentSession } = require('../../src/agent/agent');
const { windowService } = require('../services/window.service');
const { IPC_CHANNELS, AGENT_EVENTS } = require('../../src/shared/events');

let activeSession = null;
let activeBackendSessionId = null;
let activeBackendWs = null;

async function postToBackend(endpoint, data = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const req = http.request(
      `http://127.0.0.1:8000${endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
        timeout: 3000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body || '{}'));
          } catch {
            resolve({ ok: res.statusCode < 400 });
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Backend request timed out.'));
    });

    req.write(postData);
    req.end();
  });
}

function registerAgentIpc() {
  ipcMain.handle(
    IPC_CHANNELS.AGENT_START,
    async (_event, { documentData, documentPath, targetUrl, instruction, dryRun }) => {
      if (activeSession || activeBackendSessionId) {
        return { ok: false, error: 'A form-filling session is already running.' };
      }

      // Try running through Python FastAPI backend
      try {
        const createRes = await postToBackend('/sessions', {
          documentData,
          documentPath,
          targetUrl,
          instruction,
          dryRun: Boolean(dryRun),
        });

        if (createRes && createRes.sessionId) {
          activeBackendSessionId = createRes.sessionId;
          console.log(`Connected to Python agent session: ${activeBackendSessionId}`);

          // Connect WebSocket using ws library to stream events to renderer
          try {
            const WebSocketClient = require('ws');
            activeBackendWs = new WebSocketClient(`ws://127.0.0.1:8000/sessions/${activeBackendSessionId}/ws`);

            activeBackendWs.on('open', () => {
              console.log(`[IPC] WebSocket connected to backend session ${activeBackendSessionId}`);
            });

            activeBackendWs.on('message', (data) => {
              try {
                const parsedEvt = JSON.parse(data.toString());
                console.log(`[BACKEND EVT] ${parsedEvt.type}`);
                windowService.sendToRenderer(IPC_CHANNELS.AGENT_EVENT, parsedEvt);
                if (parsedEvt.type === 'complete' || parsedEvt.type === 'error') {
                  if (activeBackendWs) activeBackendWs.close();
                  activeBackendWs = null;
                  activeBackendSessionId = null;
                }
              } catch (err) {
                console.error('Error parsing backend event:', err);
              }
            });

            activeBackendWs.on('error', (err) => {
              console.error('Backend WebSocket error:', err);
            });
          } catch (wsErr) {
            console.error('Could not instantiate WebSocket client:', wsErr);
          }

          return { ok: true, sessionId: activeBackendSessionId };
        }
      } catch (backendErr) {
        console.log(`Backend session startup note (${backendErr.message}), falling back to local runner...`);
      }

      // Fallback: Local JavaScript AgentSession
      activeSession = new AgentSession({
        documentData,
        targetUrl,
        instruction,
        dryRun,
        onEvent: (evt) => windowService.sendToRenderer(IPC_CHANNELS.AGENT_EVENT, evt),
      });

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
    }
  );

  ipcMain.handle(IPC_CHANNELS.AGENT_PAUSE, async () => {
    if (activeBackendSessionId) {
      try {
        await postToBackend(`/sessions/${activeBackendSessionId}/pause`);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    }
    if (!activeSession) return { ok: false, error: 'No active session.' };
    activeSession.pause();
    return { ok: true };
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_RESUME, async () => {
    if (activeBackendSessionId) {
      try {
        await postToBackend(`/sessions/${activeBackendSessionId}/resume`);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    }
    if (!activeSession) return { ok: false, error: 'No active session.' };
    activeSession.resume();
    return { ok: true };
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_TAKEOVER, async () => {
    if (activeBackendSessionId) {
      try {
        await postToBackend(`/sessions/${activeBackendSessionId}/takeover`);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    }
    if (!activeSession) return { ok: false, error: 'No active session.' };
    await activeSession.handOverToUser();
    return { ok: true };
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_GIVE_BACK, async () => {
    if (activeBackendSessionId) {
      try {
        await postToBackend(`/sessions/${activeBackendSessionId}/give-back`);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    }
    if (!activeSession) return { ok: false, error: 'No active session.' };
    await activeSession.resumeFromUser();
    return { ok: true };
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_ANSWER, async (_event, { promptId, answer }) => {
    if (activeBackendSessionId) {
      try {
        await postToBackend(`/sessions/${activeBackendSessionId}/user-answer`, { promptId, answer });
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    }
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
