const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyControl, filterFillableFields } = require('../../src/browser/form-detector');
const { scoreFieldMatch, findBestFieldMatch } = require('../../src/browser/field-mapper');
const { FormVerifier } = require('../../src/agent/verifier');

test('Browser Layer - Control classifier categorizes DOM elements accurately', () => {
  assert.equal(classifyControl({ tag: 'input', type: 'text' }), 'text');
  assert.equal(classifyControl({ tag: 'textarea' }), 'text');
  assert.equal(classifyControl({ tag: 'select' }), 'select');
  assert.equal(classifyControl({ tag: 'input', type: 'checkbox' }), 'checkbox');
  assert.equal(classifyControl({ tag: 'input', type: 'radio' }), 'radio');
  assert.equal(classifyControl({ tag: 'button' }), 'button');
  assert.equal(classifyControl({ tag: 'div' }), 'other');
});

test('Browser Layer - Filter fillable fields excludes buttons and non-inputs', () => {
  const elements = [
    { index: 0, tag: 'input', type: 'text', label: 'Student Name' },
    { index: 1, tag: 'button', label: 'Submit Application' },
    { index: 2, tag: 'select', label: 'Gender', options: ['Male', 'Female'] },
  ];

  const fillable = filterFillableFields(elements);
  assert.equal(fillable.length, 2);
  assert.equal(fillable[0].index, 0);
  assert.equal(fillable[1].index, 2);
});

test('Browser Layer - Field mapper correctly associates document keys with form labels', () => {
  assert.ok(scoreFieldMatch('student.fullName', 'Student Full Name') >= 0.8);
  assert.ok(scoreFieldMatch('student.dateOfBirth', 'Date of Birth (DOB)') >= 0.8);
  assert.ok(scoreFieldMatch('parent.fatherName', "Father's Name") >= 0.8);
  assert.ok(scoreFieldMatch('address.pincode', 'Postal Code / PIN') >= 0.8);

  const mockForm = [
    { index: 0, tag: 'input', label: 'Candidate Full Name' },
    { index: 1, tag: 'input', label: 'D.O.B' },
    { index: 2, tag: 'input', label: 'Residential Address Line 1' },
  ];

  const nameMatch = findBestFieldMatch('student.fullName', mockForm);
  assert.ok(nameMatch !== null);
  assert.equal(nameMatch.index, 0);

  const dobMatch = findBestFieldMatch('student.dateOfBirth', mockForm);
  assert.ok(dobMatch !== null);
  assert.equal(dobMatch.index, 1);
});

test('Agent / Browser Verifier - FormVerifier tracks and validates field matches', () => {
  const verifier = new FormVerifier();

  const res1 = verifier.recordVerification(0, 'Rahul Sharma', 'Rahul Sharma', true);
  assert.equal(res1.matches, true);

  const res2 = verifier.recordVerification(1, '2010-05-14', '2010-05-15', false);
  assert.equal(res2.matches, false);

  assert.equal(verifier.allVerified(), false);

  const cleanVerifier = new FormVerifier();
  cleanVerifier.recordVerification(0, 'Aditi', 'Aditi', true);
  assert.equal(cleanVerifier.allVerified(), true);
});
