/**
 * JSDoc type definitions for the form-filling agent architecture.
 *
 * @typedef {Object} DocumentField
 * @property {string} label - Human-readable label for the field
 * @property {string|number|boolean} value - Extracted value
 * @property {'high'|'medium'|'low'} confidence - Extraction confidence
 *
 * @typedef {Object} CanonicalStudent
 * @property {string} [fullName]
 * @property {string} [dateOfBirth]
 * @property {string} [gender]
 * @property {string} [bloodGroup]
 * @property {string} [nationality]
 *
 * @typedef {Object} CanonicalParent
 * @property {string} [fatherName]
 * @property {string} [motherName]
 * @property {string} [guardianName]
 * @property {string} [contactNumber]
 * @property {string} [email]
 *
 * @typedef {Object} CanonicalAddress
 * @property {string} [street]
 * @property {string} [city]
 * @property {string} [state]
 * @property {string} [pincode]
 * @property {string} [country]
 *
 * @typedef {Object} NormalizedDocument
 * @property {CanonicalStudent} student
 * @property {CanonicalParent} parent
 * @property {CanonicalAddress} address
 * @property {DocumentField[]} fields
 * @property {string[]} warnings
 * @property {string} [rawText]
 *
 * @typedef {Object} DetectedFormField
 * @property {number} index - Numbered handle for the element
 * @property {string} tag - Tag name (input, select, textarea, etc.)
 * @property {string|null} type - Input type (text, checkbox, radio, etc.)
 * @property {string} label - Inferred label text
 * @property {string|boolean} currentValue - Current on-page value
 * @property {boolean} [checked] - Whether checkbox/radio is checked
 * @property {string[]} [options] - Available dropdown options
 * @property {boolean} [required] - Whether field is marked required
 *
 * @typedef {Object} AgentAction
 * @property {string} action - Action or tool name
 * @property {number|string} [target] - Target element index or identifier
 * @property {any} [value] - Intended value to set
 * @property {string} [reason] - Reason for the action
 */

module.exports = {};
