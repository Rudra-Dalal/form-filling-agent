// Canonical shape that raw extracted fields get normalized into. Kept as a
// plain validator (no external schema library) to keep the dependency
// footprint small for phase 1.

const CANONICAL_KEYS = Object.freeze({
  student: ['fullName', 'dateOfBirth', 'gender'],
  parent: ['fatherName', 'motherName', 'contactNumber'],
  address: ['street', 'city', 'state', 'pincode'],
});

/** @returns {import('../../shared/types').CanonicalStudentRecord} an empty skeleton */
function emptyCanonicalRecord() {
  return { student: {}, parent: {}, address: {} };
}

/**
 * Validates that a record only contains known top-level sections and keys.
 * Returns { valid, unknownKeys } rather than throwing, since partially-known
 * documents are expected and should still flow through with warnings.
 */
function validateCanonicalRecord(record) {
  const unknownKeys = [];

  for (const section of Object.keys(record || {})) {
    if (!CANONICAL_KEYS[section]) {
      unknownKeys.push(section);
      continue;
    }
    for (const key of Object.keys(record[section] || {})) {
      if (!CANONICAL_KEYS[section].includes(key)) {
        unknownKeys.push(`${section}.${key}`);
      }
    }
  }

  return { valid: unknownKeys.length === 0, unknownKeys };
}

module.exports = {
  CANONICAL_KEYS,
  emptyCanonicalRecord,
  validateCanonicalRecord,
  createEmptyCanonicalDocument: emptyCanonicalRecord,
  validateDocumentData: (doc) => ({
    valid: Boolean(doc && Array.isArray(doc.fields) && Array.isArray(doc.warnings)),
    errors: [],
  }),
};
