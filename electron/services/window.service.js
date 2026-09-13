const { BrowserWindow } = require('electron');
const path = require('path');

class WindowService {
  constructor() {
    this.mainWindow = null;
  }

  createMainWindow() {
    this.mainWindow = new BrowserWindow({
      title: 'EIGI Form Agent',
      width: 1200,
      height: 820,
      minWidth: 900,
      minHeight: 650,
      backgroundColor: '#f8fafc',
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    const fs = require('fs');
    const distPath = path.join(__dirname, '..', '..', 'dist', 'index.html');
    const legacyPath = path.join(__dirname, '..', '..', 'src', 'ui', 'index.html');

    if (fs.existsSync(distPath)) {
      this.mainWindow.loadFile(distPath);
    } else {
      this.mainWindow.loadFile(legacyPath);
    }

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    return this.mainWindow;
  }

  getMainWindow() {
    return this.mainWindow;
  }

  /**
   * Safe forwarder of events to the renderer webContents.
   * @param {string} channel
   * @param {any} payload
   */
  sendToRenderer(channel, payload) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, payload);
    }
  }
}

const windowService = new WindowService();
module.exports = { windowService };
