const XLSX = require('xlsx');

/**
 * Extracts plain text from an XLSX or XLS file formatted as CSV per sheet.
 * @param {string} filePath
 * @returns {Promise<string>}
 */
async function parseXlsx(filePath) {
  const workbook = XLSX.readFile(filePath);
  const text = workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_csv(sheet);
  }).join('\n\n');
  return text || '';
}

module.exports = { parseXlsx };
