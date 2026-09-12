// Load .env automatically if present using Node's native process.loadEnvFile
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch (_) {
    // .env file is optional
  }
}

const { app, BrowserWindow } = require('electron');
const { windowService } = require('./services/window.service');
const { backendService } = require('./services/backend.service');
const { registerDocumentIpc } = require('./ipc/document.ipc');
const { registerAgentIpc } = require('./ipc/agent.ipc');
const { registerBrowserIpc } = require('./ipc/browser.ipc');

// Initialize IPC registration
registerDocumentIpc();
registerAgentIpc();
registerBrowserIpc();

app.whenReady().then(async () => {
  try {
    await backendService.start();
  } catch (err) {
    console.error('Failed to start Python backend service:', err);
  }
  windowService.createMainWindow();
});

app.on('will-quit', () => {
  backendService.stop();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    windowService.createMainWindow();
  }
});
