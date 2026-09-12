const { ipcMain, dialog } = require('electron');
const { parseDocument } = require('../../src/document/extractor');
const { windowService } = require('../services/window.service');
const { IPC_CHANNELS } = require('../../src/shared/events');

function registerDocumentIpc() {
  ipcMain.handle(IPC_CHANNELS.DOC_PICK_AND_PARSE, async () => {
    const mainWindow = windowService.getMainWindow();
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Student Document',
      properties: ['openFile'],
      filters: [
        { name: 'Documents (PDF, DOCX, Excel)', extensions: ['pdf', 'docx', 'xlsx', 'xls'] },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const filePath = result.filePaths[0];
    try {
      const parsed = await parseDocument(filePath);
      return { canceled: false, filePath, parsed };
    } catch (err) {
      return {
        canceled: false,
        filePath,
        error: err.message,
        parsed: { fields: [], warnings: [err.message] },
      };
    }
  });
}

module.exports = { registerDocumentIpc };
