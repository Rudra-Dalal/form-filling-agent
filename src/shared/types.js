/**
 * @typedef {Object} ExtractedField
 * @property {string} label
 * @property {string} value
 * @property {'high'|'medium'|'low'} confidence
 */

/**
 * @typedef {Object} DocumentExtractionResult
 * @property {string} rawText
 * @property {ExtractedField[]} fields
 * @property {string[]} warnings
 */

/**
 * @typedef {Object} CanonicalStudentRecord
 * @property {Object} student
 * @property {string} [student.fullName]
 * @property {string} [student.dateOfBirth]
 * @property {string} [student.gender]
 * @property {Object} parent
 * @property {string} [parent.fatherName]
 * @property {string} [parent.motherName]
 * @property {string} [parent.contactNumber]
 * @property {Object} address
 * @property {string} [address.street]
 * @property {string} [address.city]
 * @property {string} [address.state]
 * @property {string} [address.pincode]
 */

/**
 * @typedef {Object} FormElementSnapshot
 * @property {number} index
 * @property {string} tag
 * @property {string|null} type
 * @property {string} label
 * @property {string} currentValue
 * @property {boolean|undefined} checked
 * @property {string[]|undefined} options
 */

/**
 * @typedef {Object} AgentEvent
 * @property {string} type
 * @property {*} [payload]
 */

module.exports = {};
