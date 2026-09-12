/**
 * Semantic mapping helpers between document fields and detected website form fields.
 */

const KNOWN_FIELD_SYNONYMS = {
  'student.fullName': ['student name', 'candidate name', 'applicant name', 'full name', 'first name', 'name'],
  'student.dateOfBirth': ['dob', 'date of birth', 'birth date', 'birthdate', 'd.o.b'],
  'student.gender': ['gender', 'sex'],
  'student.bloodGroup': ['blood group', 'blood type', 'blood'],
  'student.nationality': ['nationality', 'citizenship'],

  'parent.fatherName': ['father name', "father's name", 'father'],
  'parent.motherName': ['mother name', "mother's name", 'mother'],
  'parent.guardianName': ['guardian name', "guardian's name", 'guardian'],
  'parent.contactNumber': ['mobile', 'phone', 'contact', 'telephone', 'mobile number', 'phone number'],
  'parent.email': ['email', 'e-mail', 'email address'],

  'address.street': ['street', 'address line 1', 'address', 'residential address', 'permanent address'],
  'address.city': ['city', 'town', 'district'],
  'address.state': ['state', 'province'],
  'address.pincode': ['pincode', 'pin code', 'zip', 'zipcode', 'postal code'],
};

/**
 * Calculates a match score between a document field path and a website form field label.
 * @param {string} docFieldKey
 * @param {string} websiteLabel
 * @returns {number} Score from 0 to 1
 */
function scoreFieldMatch(docFieldKey, websiteLabel) {
  if (!websiteLabel) return 0;
  const clean = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanWithSpaces = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  const labelClean = clean(websiteLabel);
  const labelWithSpaces = cleanWithSpaces(websiteLabel);
  const synonyms = KNOWN_FIELD_SYNONYMS[docFieldKey] || [];

  for (const rawSynonym of synonyms) {
    const synClean = clean(rawSynonym);
    const synWithSpaces = cleanWithSpaces(rawSynonym);
    if (labelClean === synClean || labelWithSpaces === synWithSpaces) return 1.0;
    if (labelClean.includes(synClean) || labelWithSpaces.includes(synWithSpaces)) return 0.8;
  }

  const parts = docFieldKey.split('.');
  const lastPartClean = clean(parts[parts.length - 1]);
  if (labelClean.includes(lastPartClean)) return 0.6;

  return 0;
}

/**
 * Finds the best matching form field for a given document field key.
 * @param {string} docFieldKey
 * @param {Array<import('../shared/types').DetectedFormField>} detectedFields
 * @returns {import('../shared/types').DetectedFormField|null}
 */
function findBestFieldMatch(docFieldKey, detectedFields = []) {
  let bestScore = 0;
  let bestMatch = null;

  for (const field of detectedFields) {
    const score = scoreFieldMatch(docFieldKey, field.label);
    if (score > bestScore && score >= 0.6) {
      bestScore = score;
      bestMatch = field;
    }
  }

  return bestMatch;
}

module.exports = {
  KNOWN_FIELD_SYNONYMS,
  scoreFieldMatch,
  findBestFieldMatch,
};
