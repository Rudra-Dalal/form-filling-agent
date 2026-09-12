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

test('Document Parser - parseDocx successfully reads sample-admission-record.docx', async () => {
  const path = require('node:path');
  const { parseDocx } = require('../../src/document/parsers/docx.parser');
  const fixturePath = path.join(__dirname, '..', 'fixtures', 'sample-admission-record.docx');

  const text = await parseDocx(fixturePath);
  assert.ok(text.includes('Greenwood High School'));
  assert.ok(text.includes('Aditi Rakesh Sharma'));
  assert.ok(text.includes('Grade 8'));
});

test('Document Pipeline - parseDocument extracts structured canonical fields and warnings from docx fixture', async () => {
  const path = require('node:path');
  const { parseDocument } = require('../../src/document/extractor');
  const fixturePath = path.join(__dirname, '..', 'fixtures', 'sample-admission-record.docx');

  const result = await parseDocument(fixturePath, { dryRun: true });

  assert.equal(result.student.fullName, 'Aditi Rakesh Sharma');
  assert.equal(result.student.dateOfBirth, '2015-03-12'); // Normalized to ISO
  assert.equal(result.student.gender, 'Female');
  assert.equal(result.parent.fatherName, 'Rakesh Kumar Sharma');
  assert.equal(result.parent.motherName, 'Sunita Sharma');
  assert.equal(result.parent.contactNumber, '9876543210');
  assert.equal(result.address.city, 'Nagpur');
  assert.equal(result.address.state, 'Maharashtra');
  assert.equal(result.address.pincode, '440001');

  // Verify ambiguity detected for multiple addresses
  assert.ok(result.warnings.length > 0);
  assert.ok(result.warnings.some((w) => w.toLowerCase().includes('two different addresses')));

  // Verify unmapped fields contains Applying for Grade
  const gradeField = result.unmapped.find((f) => f.label === 'Applying for Grade');
  assert.ok(gradeField);
  assert.equal(gradeField.value, 'Grade 8');
});
