/**
 * Semantic mapping helpers between document fields and detected website form fields.
 */

const KNOWN_FIELD_SYNONYMS = {
  'student.fullName': [
    'name of student',
    'student name',
    "student's name",
    'student full name',
    "student's full name",
    'candidate name',
    'applicant name',
    'full name',
    'first name',
    'name',
  ],
  'student.dateOfBirth': ['dob', 'date of birth', 'birth date', 'birthdate', 'd.o.b'],
  'student.gender': ['gender', 'sex'],
  'student.grade': ['applying for grade', 'grade', 'class', 'admission to grade', 'applying for class'],
  'student.bloodGroup': ['blood group', 'blood type', 'blood'],
  'student.nationality': ['nationality', 'citizenship'],

  'parent.fatherName': [
    "father's full name",
    'father full name',
    'father name',
    "father's name",
    'father',
    'guardian name (father)',
  ],
  'parent.motherName': [
    "mother's full name",
    'mother full name',
    'mother name',
    "mother's name",
    'mother',
    'guardian name (mother)',
  ],
  'parent.guardianName': ['guardian name', "guardian's name", 'guardian'],
  'parent.contactNumber': [
    'primary contact number',
    'primary contact',
    'contact number',
    'contact no',
    'mobile number',
    'phone number',
    'mobile',
    'phone',
    'contact',
    'telephone',
  ],
  'parent.email': ['email', 'e-mail', 'email address'],

  'address.street': [
    'residential address',
    'street',
    'address line 1',
    'address',
    'residential address line 1',
    'permanent address',
    'permanent address line 1',
  ],
  'address.city': ['city / town', 'city', 'town', 'district'],
  'address.state': ['state', 'province'],
  'address.pincode': ['pin code', 'postal code / pin', 'pincode', 'pin', 'zip', 'zipcode', 'postal code'],
};

/**
 * Calculates a match score between a document field path and a website form field label or identifier.
 * @param {string} docFieldKey
 * @param {string} websiteLabel
 * @returns {number} Score from 0 to 1
 */
function scoreFieldMatch(docFieldKey, websiteLabel) {
  if (!websiteLabel || typeof websiteLabel !== 'string') return 0;
  const clean = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanWithSpaces = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  const labelClean = clean(websiteLabel);
  const labelWithSpaces = cleanWithSpaces(websiteLabel);

  // Direct match for unmapped labels like 'Applying for Grade'
  const keyLower = docFieldKey.toLowerCase();
  if (labelWithSpaces === keyLower || labelClean === clean(keyLower)) {
    return 1.0;
  }

  // Alias lookup
  let synonyms = KNOWN_FIELD_SYNONYMS[docFieldKey];
  if (!synonyms && keyLower.includes('grade')) {
    synonyms = KNOWN_FIELD_SYNONYMS['student.grade'];
  }
  synonyms = synonyms || [];

  for (const rawSynonym of synonyms) {
    const synClean = clean(rawSynonym);
    const synWithSpaces = cleanWithSpaces(rawSynonym);
    if (labelClean === synClean || labelWithSpaces === synWithSpaces) return 1.0;
    if (labelClean.includes(synClean) || labelWithSpaces.includes(synWithSpaces)) return 0.85;
    if (synClean.includes(labelClean) || synWithSpaces.includes(labelWithSpaces)) return 0.8;
  }

  const parts = docFieldKey.split('.');
  const lastPartClean = clean(parts[parts.length - 1]);
  if (lastPartClean && (labelClean.includes(lastPartClean) || lastPartClean.includes(labelClean))) {
    return 0.65;
  }

  return 0;
}

/**
 * Finds the best matching form field for a given document field key.
 * Inspects label, name, id, placeholder, and legend context.
 * @param {string} docFieldKey
 * @param {Array<import('../shared/types').DetectedFormField>} detectedFields
 * @returns {import('../shared/types').DetectedFormField|null}
 */
function findBestFieldMatch(docFieldKey, detectedFields = []) {
  let bestScore = 0;
  let bestMatch = null;

  for (const field of detectedFields) {
    // Score against label
    let score = scoreFieldMatch(docFieldKey, field.label);

    // Score against combined legend + label for contextual grouping
    if (field.legend && field.label) {
      const combinedScore = scoreFieldMatch(docFieldKey, `${field.legend} ${field.label}`);
      if (combinedScore > score) score = combinedScore;
    }

    // Score against name, id, and placeholder if label was weak
    if (score < 0.8) {
      if (field.name) {
        const nameScore = scoreFieldMatch(docFieldKey, field.name);
        if (nameScore > score) score = nameScore * 0.9;
      }
      if (field.id) {
        const idScore = scoreFieldMatch(docFieldKey, field.id);
        if (idScore > score) score = idScore * 0.9;
      }
      if (field.placeholder) {
        const phScore = scoreFieldMatch(docFieldKey, field.placeholder);
        if (phScore > score) score = phScore * 0.85;
      }
    }

    if (score > bestScore && score >= 0.6) {
      bestScore = score;
      bestMatch = field;
    }
  }

  return bestMatch;
}

/**
 * Finds the best matching option text in a <select> element for a given target value.
 * Supports case-insensitivity, substring match, and option values.
 * @param {string} targetValue
 * @param {import('../shared/types').DetectedFormField} field
 * @returns {string|null} The option label to select
 */
function findMatchingOption(targetValue, field) {
  if (!field || !Array.isArray(field.options) || field.options.length === 0) {
    return null;
  }

  const target = String(targetValue).trim().toLowerCase();
  const options = field.options;
  const values = field.optionValues || [];

  // 1. Exact match on option text (case-insensitive)
  for (const opt of options) {
    if (opt.trim().toLowerCase() === target) return opt;
  }

  // 2. Exact match on option value
  for (let i = 0; i < values.length; i++) {
    if (String(values[i]).trim().toLowerCase() === target) {
      return options[i] || values[i];
    }
  }

  // 3. Substring match (e.g. target "Female" matches "Female", "Grade 8" matches "Grade 8" or "8")
  for (const opt of options) {
    const optLower = opt.trim().toLowerCase();
    if (optLower && (optLower.includes(target) || target.includes(optLower))) {
      // Avoid matching placeholder like "-- Select --"
      if (!optLower.includes('select') && !optLower.includes('choose')) {
        return opt;
      }
    }
  }

  // 4. Number match (e.g. "Grade 8" -> number 8 matches option value "8" or text "8")
  const numMatch = target.match(/\d+/);
  if (numMatch) {
    const num = numMatch[0];
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      const val = values[i] !== undefined ? String(values[i]) : '';
      if (opt.includes(num) || val === num) {
        return opt;
      }
    }
  }

  return null;
}

module.exports = {
  KNOWN_FIELD_SYNONYMS,
  scoreFieldMatch,
  findBestFieldMatch,
  findMatchingOption,
};
