const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeDocumentFields } = require('../../src/document/normalizer');
const { validateDocumentData } = require('../../src/agent/schemas/document.schema');

test('Document Layer - Normalizer maps extracted fields to canonical structure', () => {
  const mockFields = [
    { label: 'Student Full Name', value: 'Rahul Sharma', confidence: 'high' },
    { label: 'Date of Birth', value: '2010-05-14', confidence: 'high' },
    { label: 'Gender', value: 'Male', confidence: 'high' },
    { label: 'Blood Group', value: 'B+', confidence: 'medium' },
    { label: "Father's Name", value: 'Amit Sharma', confidence: 'high' },
    { label: "Mother's Name", value: 'Pooja Sharma', confidence: 'high' },
    { label: 'Mobile Number', value: '+91 9876543210', confidence: 'high' },
    { label: 'Address Line', value: '123 MG Road', confidence: 'high' },
    { label: 'City', value: 'Mumbai', confidence: 'high' },
    { label: 'State', value: 'Maharashtra', confidence: 'high' },
    { label: 'Pincode', value: '400001', confidence: 'high' },
  ];

  const mockWarnings = ['Permanent vs correspondence address not distinguished'];

  const normalized = normalizeDocumentFields(mockFields, mockWarnings, 'Raw text sample');

  assert.equal(normalized.student.fullName, 'Rahul Sharma');
  assert.equal(normalized.student.dateOfBirth, '2010-05-14');
  assert.equal(normalized.student.gender, 'Male');
  assert.equal(normalized.student.bloodGroup, 'B+');
  assert.equal(normalized.parent.fatherName, 'Amit Sharma');
  assert.equal(normalized.parent.motherName, 'Pooja Sharma');
  assert.equal(normalized.parent.contactNumber, '+91 9876543210');
  assert.equal(normalized.address.street, '123 MG Road');
  assert.equal(normalized.address.city, 'Mumbai');
  assert.equal(normalized.address.state, 'Maharashtra');
  assert.equal(normalized.address.pincode, '400001');

  // Verify schema validation
  const validation = validateDocumentData(normalized);
  assert.equal(validation.valid, true);
  assert.equal(validation.errors.length, 0);
});

test('Document Layer - Normalizer handles empty or partial input gracefully', () => {
  const normalized = normalizeDocumentFields([], []);
  assert.equal(normalized.student.fullName, '');
  assert.equal(normalized.parent.fatherName, '');
  assert.equal(normalized.address.city, '');
  assert.equal(normalized.fields.length, 0);
  assert.equal(normalized.warnings.length, 0);

  const validation = validateDocumentData(normalized);
  assert.equal(validation.valid, true);
});
