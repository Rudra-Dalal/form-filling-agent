/**
 * Form element data contracts and validation.
 */

function validateFormField(field) {
  const errors = [];
  if (typeof field.index !== 'number') {
    errors.push('Form field must have a numeric "index"');
  }
  if (!field.tag || typeof field.tag !== 'string') {
    errors.push('Form field must have a string "tag"');
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateFormSnapshot(snapshot) {
  if (!Array.isArray(snapshot)) {
    return { valid: false, errors: ['Form snapshot must be an array'] };
  }
  const allErrors = [];
  snapshot.forEach((field, i) => {
    const res = validateFormField(field);
    if (!res.valid) {
      allErrors.push(`Field at index ${i}: ${res.errors.join(', ')}`);
    }
  });
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}

module.exports = {
  validateFormField,
  validateFormSnapshot,
};
