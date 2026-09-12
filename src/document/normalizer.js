const { emptyCanonicalRecord } = require('../agent/schemas/document.schema');

// Ordered list of (canonical path, list of label keywords to match against,
// lowercased). First match wins, so more specific keywords should precede
// more general ones (e.g. "father" before a bare "name").
const LABEL_RULES = [
  ['student.fullName', ['student name', "student's name", 'applicant name', 'full name', 'candidate name']],
  ['student.dateOfBirth', ['date of birth', 'dob', 'birth date']],
  ['student.gender', ['gender', 'sex']],
  ['parent.fatherName', ["father's name", 'father name', 'guardian name (father)']],
  ['parent.motherName', ["mother's name", 'mother name', 'guardian name (mother)']],
  ['parent.contactNumber', ['contact number', 'phone number', 'mobile number', 'contact no']],
  ['address.pincode', ['pincode', 'pin code', 'zip code', 'postal code']],
  ['address.state', ['state']],
  ['address.city', ['city', 'town', 'district']],
  ['address.street', ['address', 'street', 'residential address']],
];

function normalizeDateValue(val) {
  if (!val || typeof val !== 'string') return val;
  const trimmed = val.trim();
  // Already ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  return trimmed;
}

function matchRule(label) {
  const lower = label.toLowerCase().trim();
  for (const [path, keywords] of LABEL_RULES) {
    if (keywords.some((kw) => lower.includes(kw))) return path;
  }
  return null;
}

function setPath(record, path, value) {
  const [section, key] = path.split('.');
  let finalValue = value;
  if (path === 'student.dateOfBirth') {
    finalValue = normalizeDateValue(value);
  }
  record[section][key] = finalValue;
}

/**
 * Turns {label, value, confidence}[] from field extraction into the
 * canonical record. Fields that don't match any known rule are returned
 * separately as `unmapped` rather than silently dropped, since a school
 * form may still need them and the agent's ask_user tool can surface them.
 *
 * @param {import('../shared/types').ExtractedField[]} fields
 */
function normalizeFields(fields) {
  const record = emptyCanonicalRecord();
  const unmapped = [];

  for (const field of fields) {
    const path = matchRule(field.label);
    if (path) {
      setPath(record, path, field.value);
    } else {
      unmapped.push(field);
    }
  }

  return { record, unmapped };
}

function normalizeDocumentFields(fields = [], warnings = [], rawText = '') {
  const { record, unmapped } = normalizeFields(fields);
  return {
    student: record.student,
    parent: record.parent,
    address: record.address,
    record,
    unmapped,
    fields,
    warnings: warnings || [],
    rawText: rawText || '',
  };
}

module.exports = { normalizeFields, matchRule, normalizeDocumentFields };
