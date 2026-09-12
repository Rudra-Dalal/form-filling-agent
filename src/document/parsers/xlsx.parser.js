const XLSX = require('xlsx');
const { DocumentParseError } = require('../../shared/errors');

function parseXlsx(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    return workbook.SheetNames.map((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      return `# Sheet: ${sheetName}\n${XLSX.utils.sheet_to_csv(sheet)}`;
    }).join('\n\n');
  } catch (err) {
    throw new DocumentParseError(`Failed to parse spreadsheet at ${filePath}: ${err.message}`);
  }
}

module.exports = { parseXlsx };
