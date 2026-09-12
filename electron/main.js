const { app, BrowserWindow } = require('electron');
const { windowService } = require('./services/window.service');
const { registerDocumentIpc } = require('./ipc/document.ipc');
const { registerAgentIpc } = require('./ipc/agent.ipc');
const { registerBrowserIpc } = require('./ipc/browser.ipc');

// Initialize IPC registration
registerDocumentIpc();
registerAgentIpc();
registerBrowserIpc();

app.whenReady().then(() => {
  windowService.createMainWindow();
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
