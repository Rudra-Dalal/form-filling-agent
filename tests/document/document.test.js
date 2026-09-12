const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeFields, matchRule } = require('../../src/document/normalizer');
const {
  emptyCanonicalRecord,
  validateCanonicalRecord,
} = require('../../src/agent/schemas/document.schema');

test('matchRule maps common label variants to canonical paths', () => {
  assert.equal(matchRule('Date of Birth'), 'student.dateOfBirth');
  assert.equal(matchRule('DOB'), 'student.dateOfBirth');
  assert.equal(matchRule("Father's Name"), 'parent.fatherName');
  assert.equal(matchRule('Pin Code'), 'address.pincode');
  assert.equal(matchRule('Favorite Color'), null);
});

test('normalizeFields builds a canonical record and separates unmapped fields', () => {
  const fields = [
    { label: 'Student Full Name', value: 'Aditi Sharma', confidence: 'high' },
    { label: 'DOB', value: '2015-03-12', confidence: 'high' },
    { label: "Father's Name", value: 'Rakesh Sharma', confidence: 'high' },
    { label: 'Blood Group', value: 'O+', confidence: 'medium' }, // not in schema
  ];

  const { record, unmapped } = normalizeFields(fields);

  assert.equal(record.student.fullName, 'Aditi Sharma');
  assert.equal(record.student.dateOfBirth, '2015-03-12');
  assert.equal(record.parent.fatherName, 'Rakesh Sharma');
  assert.equal(unmapped.length, 1);
  assert.equal(unmapped[0].label, 'Blood Group');
});

test('emptyCanonicalRecord matches the shape validateCanonicalRecord expects', () => {
  const record = emptyCanonicalRecord();
  const { valid, unknownKeys } = validateCanonicalRecord(record);
  assert.equal(valid, true);
  assert.deepEqual(unknownKeys, []);
});

test('validateCanonicalRecord flags keys outside the canonical schema', () => {
  const record = { student: { fullName: 'X' }, parent: {}, address: {}, extra: {} };
  const { valid, unknownKeys } = validateCanonicalRecord(record);
  assert.equal(valid, false);
  assert.deepEqual(unknownKeys, ['extra']);
});
