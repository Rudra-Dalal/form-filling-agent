/**
 * Document data structure validation and contract.
 */

function validateDocumentData(docData) {
  if (!docData || typeof docData !== 'object') {
    return { valid: false, errors: ['Document data must be a valid object'] };
  }

  const errors = [];
  if (!Array.isArray(docData.fields)) {
    errors.push('Document data must contain a "fields" array');
  }
  if (!Array.isArray(docData.warnings)) {
    errors.push('Document data must contain a "warnings" array');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Creates an empty canonical document structure.
 */
function createEmptyCanonicalDocument() {
  return {
    student: {
      fullName: '',
      dateOfBirth: '',
      gender: '',
      bloodGroup: '',
      nationality: '',
    },
    parent: {
      fatherName: '',
      motherName: '',
      guardianName: '',
      contactNumber: '',
      email: '',
    },
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: '',
    },
    fields: [],
    warnings: [],
    rawText: '',
  };
}

module.exports = {
  validateDocumentData,
  createEmptyCanonicalDocument,
};
