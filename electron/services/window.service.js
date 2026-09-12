const { BrowserWindow } = require('electron');
const path = require('path');

class WindowService {
  constructor() {
    this.mainWindow = null;
  }

  createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1100,
      height: 780,
      minWidth: 800,
      minHeight: 600,
      backgroundColor: '#0f1115',
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    // Load from src/ui/index.html
    const indexPath = path.join(__dirname, '..', '..', 'src', 'ui', 'index.html');
    this.mainWindow.loadFile(indexPath);

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
