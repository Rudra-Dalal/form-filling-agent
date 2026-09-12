const mammoth = require('mammoth');
const { DocumentParseError } = require('../../shared/errors');

async function parseDocx(filePath) {
  try {
    const { value } = await mammoth.extractRawText({ path: filePath });
    return value;
  } catch (err) {
    throw new DocumentParseError(`Failed to parse DOCX at ${filePath}: ${err.message}`);
  }
}

module.exports = { parseDocx };
