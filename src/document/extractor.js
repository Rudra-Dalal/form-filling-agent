const path = require('path');

const { parsePdf } = require('./parsers/pdf.parser');
const { parseDocx } = require('./parsers/docx.parser');
const { parseXlsx } = require('./parsers/xlsx.parser');
const { normalizeFields } = require('./normalizer');
const { getLLMClient, hasLLMKey } = require('../agent/llm-client');
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

/**
 * Deterministic regex/heuristic extractor for structured school documents.
 * Used when no Anthropic API key is configured or in dry-run/testing mode.
 * @param {string} rawText
 * @returns {{fields: import('../shared/types').ExtractedField[], warnings: string[]}}
 */
function extractStructuredFieldsHeuristic(rawText) {
  const fields = [];
  const warnings = [];

  const text = rawText || '';

  // Helper to extract a single pattern match
  const findMatch = (regex) => {
    const m = text.match(regex);
    return m ? m[1].trim() : null;
  };

  // Student details
  const name = findMatch(/(?:Student Name|Full Name|Candidate Name|Applicant Name):\s*([^\r\n]+)/i);
  if (name) fields.push({ label: 'Student Full Name', value: name, confidence: 'high' });

  const dob = findMatch(/(?:DOB|Date of Birth|Birth Date):\s*([^\r\n]+)/i);
  if (dob) fields.push({ label: 'Date of Birth', value: dob, confidence: 'high' });

  const gender = findMatch(/(?:Sex|Gender):\s*([^\r\n]+)/i);
  if (gender) fields.push({ label: 'Gender', value: gender, confidence: 'high' });

  // Parent details
  const father = findMatch(/(?:Father's Name|Father Name):\s*([^\r\n]+)/i);
  if (father) fields.push({ label: "Father's Name", value: father, confidence: 'high' });

  const mother = findMatch(/(?:Mother's Name|Mother Name):\s*([^\r\n]+)/i);
  if (mother) fields.push({ label: "Mother's Name", value: mother, confidence: 'high' });

  const phone = findMatch(/(?:Contact Number|Phone Number|Mobile Number|Contact No|Mobile):\s*([^\r\n]+)/i);
  if (phone) fields.push({ label: 'Contact Number', value: phone, confidence: 'high' });

  // Grade / Class
  const gradeProse = findMatch(/Applying for admission to Grade\s*(\d+)/i) ||
    findMatch(/Applying for Grade:\s*([^\r\n]+)/i) ||
    findMatch(/(?:Grade|Class):\s*([^\r\n]+)/i);
  if (gradeProse) {
    const gradeVal = gradeProse.toLowerCase().startsWith('grade') ? gradeProse : `Grade ${gradeProse}`;
    fields.push({ label: 'Applying for Grade', value: gradeVal, confidence: 'high' });
  }

  // Address handling & ambiguity detection
  const permAddress = findMatch(/Permanent Address:\s*([^\r\n]+)/i);
  const corrAddress = findMatch(/Correspondence Address:\s*([^\r\n]+)/i);
  const singleAddress = findMatch(/(?:Residential Address|Address):\s*([^\r\n]+)/i);

  if (permAddress && corrAddress) {
    warnings.push(
      `Two different addresses appear in document (permanent: "${permAddress}" vs correspondence: "${corrAddress}") - residential address is ambiguous`
    );
    fields.push({ label: 'Permanent Address', value: permAddress, confidence: 'high' });
    fields.push({ label: 'Correspondence Address', value: corrAddress, confidence: 'high' });

    // Parse address components from permanent address as primary candidate
    const parts = permAddress.split(',').map((s) => s.trim());
    if (parts.length >= 4) {
      fields.push({ label: 'Residential Address', value: parts[0], confidence: 'medium' });
      fields.push({ label: 'City', value: parts[1], confidence: 'high' });
      fields.push({ label: 'State', value: parts[2], confidence: 'high' });
      fields.push({ label: 'PIN Code', value: parts[3], confidence: 'high' });
    } else {
      fields.push({ label: 'Residential Address', value: permAddress, confidence: 'medium' });
    }
  } else if (singleAddress) {
    const parts = singleAddress.split(',').map((s) => s.trim());
    if (parts.length >= 4) {
      fields.push({ label: 'Residential Address', value: parts[0], confidence: 'high' });
      fields.push({ label: 'City', value: parts[1], confidence: 'high' });
      fields.push({ label: 'State', value: parts[2], confidence: 'high' });
      fields.push({ label: 'PIN Code', value: parts[3], confidence: 'high' });
    } else {
      fields.push({ label: 'Residential Address', value: singleAddress, confidence: 'high' });
    }
  }

  return { fields, warnings };
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
 * Full pipeline: file on disk -> raw text -> field extraction ->
 * canonical record + unmapped fields + warnings.
 * Uses LLM extraction if API key is present; falls back to heuristic extractor seamlessly.
 *
 * @param {string} filePath
 * @param {Object} [options]
 * @param {boolean} [options.dryRun]
 */
async function extractDocument(filePath, options = {}) {
  const rawText = await readRawText(filePath);
  let fields;
  let warnings;

  if (!options.dryRun && hasLLMKey()) {
    try {
      const llmResult = await extractStructuredFields(rawText);
      fields = llmResult.fields;
      warnings = llmResult.warnings;
    } catch (_) {
      // Fall back to heuristic extraction on LLM error
      const heuristicResult = extractStructuredFieldsHeuristic(rawText);
      fields = heuristicResult.fields;
      warnings = heuristicResult.warnings;
    }
  } else {
    const heuristicResult = extractStructuredFieldsHeuristic(rawText);
    fields = heuristicResult.fields;
    warnings = heuristicResult.warnings;
  }

  const { record, unmapped } = normalizeFields(fields);
  return { rawText, fields, record, unmapped, warnings };
}

/**
 * Compatibility wrapper returning both flat fields and canonical sections.
 */
async function parseDocument(filePath, options = {}) {
  const extracted = await extractDocument(filePath, options);
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

module.exports = {
  extractDocument,
  parseDocument,
  readRawText,
  extractStructuredFields,
  extractStructuredFieldsHeuristic,
};

