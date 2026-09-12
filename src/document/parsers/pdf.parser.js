const fs = require('fs/promises');
const pdfParse = require('pdf-parse');

/**
 * Extracts plain text from a PDF file buffer.
 * @param {string} filePath
 * @returns {Promise<string>}
 */
async function parsePdf(filePath) {
  const buffer = await fs.readFile(filePath);
  const data = await pdfParse(buffer);
  return data.text || '';
}

module.exports = { parsePdf };
