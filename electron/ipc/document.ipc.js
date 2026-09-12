const { ipcMain, dialog } = require('electron');
const http = require('http');
const { windowService } = require('../services/window.service');
const { IPC_CHANNELS } = require('../../src/shared/events');
const { parseDocument: legacyParseDocument } = require('../../src/document/extractor');

async function parseViaBackend(filePath) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ filePath, dryRun: true });
    const req = http.request(
      'http://127.0.0.1:8000/documents/parse',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
        timeout: 4000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(body));
            } catch (err) {
              reject(err);
            }
          } else {
            reject(new Error(`Backend returned status ${res.statusCode}: ${body}`));
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

function registerDocumentIpc() {
  ipcMain.handle(IPC_CHANNELS.DOC_PICK_AND_PARSE, async (_event, arg) => {
    let filePath = arg?.filePath || process.env.E2E_FIXTURE_DOC;

    if (!filePath) {
      const mainWindow = windowService.getMainWindow();
      const result = await dialog.showOpenDialog(mainWindow || undefined, {
        title: 'Select Student Document',
        properties: ['openFile'],
        filters: [
          { name: 'Documents (PDF, DOCX, Excel)', extensions: ['pdf', 'docx', 'xlsx', 'xls'] },
          { name: 'Word Documents (*.docx)', extensions: ['docx'] },
          { name: 'PDF Documents (*.pdf)', extensions: ['pdf'] },
          { name: 'Excel Spreadsheets (*.xlsx, *.xls)', extensions: ['xlsx', 'xls'] },
          { name: 'All Files (*.*)', extensions: ['*'] },
        ],
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { canceled: true };
      }

      filePath = result.filePaths[0];
    }

    // Attempt parsing via FastAPI backend, with seamless fallback to local parser
    try {
      const parsed = await parseViaBackend(filePath);
      return { canceled: false, filePath, parsed };
    } catch (backendErr) {
      console.log(`Backend parser note (${backendErr.message}), using local parser fallback...`);
      try {
        const parsed = await legacyParseDocument(filePath);
        return { canceled: false, filePath, parsed };
      } catch (err) {
        return {
          canceled: false,
          filePath,
          error: err.message,
          parsed: { fields: [], warnings: [err.message] },
        };
      }
    }
  });
}

module.exports = { registerDocumentIpc };
