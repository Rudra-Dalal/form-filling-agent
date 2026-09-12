const path = require('path');
const { parsePdf } = require('./parsers/pdf.parser');
const { parseDocx } = require('./parsers/docx.parser');
const { parseXlsx } = require('./parsers/xlsx.parser');
const { normalizeDocumentFields } = require('./normalizer');
const { getLLMClient } = require('../agent/llm-client');
const { EXTRACTION_SYSTEM_PROMPT } = require('../agent/prompts/system.prompt');
const { DocumentParseError } = require('../shared/errors');
const {
  DEFAULT_LLM_MODEL,
  MAX_EXTRACTION_TOKENS,
  RAW_TEXT_MAX_LENGTH,
} = require('../shared/constants');

/**
 * Extracts structured fields from a document's raw text via LLM.
 * @param {string} rawText
 * @returns {Promise<{fields: Array, warnings: Array}>}
 */
async function extractStructuredFields(rawText) {
  const client = getLLMClient();

  const response = await client.messages.create({
    model: DEFAULT_LLM_MODEL,
    max_tokens: MAX_EXTRACTION_TOKENS,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: rawText.slice(0, RAW_TEXT_MAX_LENGTH) }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  const cleaned = (textBlock?.text || '{}').replace(/```json|```/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      fields: parsed.fields || [],
      warnings: parsed.warnings || [],
    };
  } catch (err) {
    return {
      fields: [],
      warnings: [`Field extraction failed to parse a response: ${err.message}`],
    };
  }
}

/**
 * Reads a document from disk, extracts raw text via file parsers,
 * performs LLM-based field extraction, and normalizes into canonical format.
 *
 * @param {string} filePath
 * @returns {Promise<import('../shared/types').NormalizedDocument>}
 */
async function parseDocument(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  let rawText = '';

  try {
    if (ext === '.pdf') {
      rawText = await parsePdf(filePath);
    } else if (ext === '.docx') {
      rawText = await parseDocx(filePath);
    } else if (ext === '.xlsx' || ext === '.xls') {
      rawText = await parseXlsx(filePath);
    } else {
      throw new DocumentParseError(`Unsupported file type: ${ext}`, filePath);
    }
  } catch (err) {
    if (err instanceof DocumentParseError) throw err;
    throw new DocumentParseError(`Failed to parse document: ${err.message}`, filePath);
  }

  const { fields, warnings } = await extractStructuredFields(rawText);
  return normalizeDocumentFields(fields, warnings, rawText);
}

module.exports = {
  parseDocument,
  extractStructuredFields,
};
