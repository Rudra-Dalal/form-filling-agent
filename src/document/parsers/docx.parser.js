const mammoth = require('mammoth');

/**
 * Extracts plain text from a DOCX file.
 * @param {string} filePath
 * @returns {Promise<string>}
 */
async function parseDocx(filePath) {
  const { value } = await mammoth.extractRawText({ path: filePath });
  return value || '';
}

module.exports = { parseDocx };
