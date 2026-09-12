const path = require('path');

const { parsePdf } = require('./parsers/pdf.parser');
const { parseDocx } = require('./parsers/docx.parser');
const { parseXlsx } = require('./parsers/xlsx.parser');
const { normalizeFields } = require('./normalizer');
const { getLLMClient } = require('../agent/llm-client');
const { SUPPORTED_DOCUMENT_EXTENSIONS, LIMITS, MODELS } = require('../shared/constants');
const { DocumentParseError, ExtractionError } = require('../shared/errors');

const EXTRACTION_SYSTEM_PROMPT = `You extract structured personal/administrative information from a school
document's raw text (admission forms, ID pages, etc).

Return ONLY valid JSON, no prose, no markdown fences, matching this shape:
{
  "fields": [
    { "label": "Student Full Name", "value": "Aditi Sharma", "confidence": "high" },
    { "label": "Date of Birth", "value": "2015-03-12", "confidence": "high" }
  ],
  "warnings": [
    "Parent's occupation not found in the document",
    "Two different addresses appear - permanent and correspondence - unclear which to use"
  ]
}

Rules:
- Only include a field if the text actually supports it. Never invent values.
- confidence is "high" only when the value is stated unambiguously and once.
- If a value is missing, unclear, or conflicting, do NOT guess - omit it from
  "fields" and describe the issue in "warnings" instead.
- Dates: normalize to ISO (YYYY-MM-DD) when the source format is unambiguous;
  otherwise leave as found in the text and add a warning.`;

async function readRawText(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (!SUPPORTED_DOCUMENT_EXTENSIONS.includes(ext)) {
    throw new DocumentParseError(`Unsupported file type: ${ext}`);
  }

  if (ext === '.pdf') return parsePdf(filePath);
  if (ext === '.docx') return parseDocx(filePath);
  return parseXlsx(filePath); // .xlsx / .xls
}

/** @returns {Promise<{fields: import('../shared/types').ExtractedField[], warnings: string[]}>} */
async function extractStructuredFields(rawText) {
  const client = getLLMClient();

  let response;
  try {
    response = await client.messages.create({
      model: MODELS.DEFAULT,
      max_tokens: 2000,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: rawText.slice(0, LIMITS.MAX_DOCUMENT_CHARS_FOR_EXTRACTION) }],
    });
  } catch (err) {
    throw new ExtractionError(`LLM extraction request failed: ${err.message}`);
  }

  const textBlock = response.content.find((block) => block.type === 'text');
  const cleaned = (textBlock?.text || '{}').replace(/```json|```/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    return { fields: parsed.fields || [], warnings: parsed.warnings || [] };
  } catch (err) {
    throw new ExtractionError(`Could not parse extraction response as JSON: ${err.message}`);
  }
}

/**
 * Full pipeline: file on disk -> raw text -> LLM field extraction ->
 * canonical record + unmapped fields + warnings.
 */
async function extractDocument(filePath) {
  const rawText = await readRawText(filePath);
  const { fields, warnings } = await extractStructuredFields(rawText);
  const { record, unmapped } = normalizeFields(fields);

  return { rawText, fields, record, unmapped, warnings };
}

/**
 * Compatibility wrapper returning both flat fields and canonical sections.
 */
async function parseDocument(filePath) {
  const extracted = await extractDocument(filePath);
  return {
    rawText: extracted.rawText,
    fields: extracted.fields,
    warnings: extracted.warnings,
    record: extracted.record,
    student: extracted.record.student,
    parent: extracted.record.parent,
    address: extracted.record.address,
    unmapped: extracted.unmapped,
  };
}

module.exports = { extractDocument, parseDocument, readRawText, extractStructuredFields };

