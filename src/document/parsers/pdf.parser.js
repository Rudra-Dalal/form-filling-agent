const fs = require('fs/promises');
const pdfParse = require('pdf-parse');
const { DocumentParseError } = require('../../shared/errors');

async function parsePdf(filePath) {
  try {
    const buffer = await fs.readFile(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  } catch (err) {
    throw new DocumentParseError(`Failed to parse PDF at ${filePath}: ${err.message}`);
  }
}

module.exports = { parsePdf };
