const { createEmptyCanonicalDocument } = require('../agent/schemas/document.schema');

/**
 * Normalizes extracted field key-value pairs into a predictable canonical structure.
 * Maps common aliases for student, parent, and address fields.
 *
 * @param {Array<{label: string, value: string|number, confidence: string}>} fields
 * @param {string[]} [warnings=[]]
 * @param {string} [rawText='']
 * @returns {import('../shared/types').NormalizedDocument}
 */
function normalizeDocumentFields(fields = [], warnings = [], rawText = '') {
  const normalized = createEmptyCanonicalDocument();
  normalized.fields = Array.isArray(fields) ? [...fields] : [];
  normalized.warnings = Array.isArray(warnings) ? [...warnings] : [];
  normalized.rawText = rawText || '';

  const normalizeKey = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

  for (const item of normalized.fields) {
    if (!item || !item.label) continue;
    const key = normalizeKey(item.label);
    const val = String(item.value ?? '').trim();

    // Student mapping
    if (key.includes('studentname') || key === 'name' || key.includes('fullname')) {
      if (!normalized.student.fullName) normalized.student.fullName = val;
    } else if (key.includes('dob') || key.includes('dateofbirth') || key.includes('birthdate')) {
      if (!normalized.student.dateOfBirth) normalized.student.dateOfBirth = val;
    } else if (key === 'gender' || key === 'sex') {
      if (!normalized.student.gender) normalized.student.gender = val;
    } else if (key.includes('bloodgroup') || key.includes('bloodtype')) {
      if (!normalized.student.bloodGroup) normalized.student.bloodGroup = val;
    } else if (key.includes('nationality') || key.includes('citizenship')) {
      if (!normalized.student.nationality) normalized.student.nationality = val;
    }

    // Parent mapping
    else if (key.includes('father') || key.includes('fathername')) {
      if (!normalized.parent.fatherName) normalized.parent.fatherName = val;
    } else if (key.includes('mother') || key.includes('mothername')) {
      if (!normalized.parent.motherName) normalized.parent.motherName = val;
    } else if (key.includes('guardian') || key.includes('guardianname')) {
      if (!normalized.parent.guardianName) normalized.parent.guardianName = val;
    } else if (key.includes('phone') || key.includes('mobile') || key.includes('contact')) {
      if (!normalized.parent.contactNumber) normalized.parent.contactNumber = val;
    } else if (key.includes('email') || key.includes('mail')) {
      if (!normalized.parent.email) normalized.parent.email = val;
    }

    // Address mapping
    else if (key.includes('street') || key.includes('addressline') || key.includes('address')) {
      if (!normalized.address.street) normalized.address.street = val;
    } else if (key.includes('city') || key.includes('town')) {
      if (!normalized.address.city) normalized.address.city = val;
    } else if (key.includes('state') || key.includes('province')) {
      if (!normalized.address.state) normalized.address.state = val;
    } else if (key.includes('pincode') || key.includes('zip') || key.includes('postalcode')) {
      if (!normalized.address.pincode) normalized.address.pincode = val;
    } else if (key.includes('country')) {
      if (!normalized.address.country) normalized.address.country = val;
    }
  }

  return normalized;
}

module.exports = { normalizeDocumentFields };
