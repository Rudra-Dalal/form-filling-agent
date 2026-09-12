const { findBestFieldMatch } = require('../browser/field-mapper');

/**
 * Lightweight planning helper to evaluate progress and suggest next form fields to fill.
 */
class AgentPlanner {
  constructor(documentData = {}) {
    this.documentData = documentData;
    this.filledFields = new Set();
    this.verifiedFields = new Set();
  }

  /**
   * Identifies candidate mappings between detected form elements and document fields.
   * @param {Array<import('../shared/types').DetectedFormField>} formSnapshot
   * @returns {Array<{field: import('../shared/types').DetectedFormField, docKey: string}>}
   */
  generateFillPlan(formSnapshot = []) {
    const candidates = [];
    const student = this.documentData.student || {};
    const parent = this.documentData.parent || {};
    const address = this.documentData.address || {};

    const checkCategory = (categoryName, categoryObj) => {
      for (const [key, val] of Object.entries(categoryObj)) {
        if (!val) continue;
        const fullKey = `${categoryName}.${key}`;
        const match = findBestFieldMatch(fullKey, formSnapshot);
        if (match && !this.filledFields.has(match.index)) {
          candidates.push({
            elementIndex: match.index,
            label: match.label,
            docKey: fullKey,
            value: val,
          });
        }
      }
    };

    checkCategory('student', student);
    checkCategory('parent', parent);
    checkCategory('address', address);

    // Also include unmapped document fields (e.g. Applying for Grade, Blood Group)
    const unmapped = this.documentData.unmapped || [];
    for (const item of unmapped) {
      if (!item || !item.value) continue;
      const match = findBestFieldMatch(item.label, formSnapshot);
      if (match && !this.filledFields.has(match.index) && !candidates.some((c) => c.elementIndex === match.index)) {
        candidates.push({
          elementIndex: match.index,
          label: match.label,
          docKey: item.label,
          value: item.value,
        });
      }
    }

    return candidates;
  }

  recordFilled(elementIndex) {
    this.filledFields.add(elementIndex);
  }

  recordVerified(elementIndex) {
    this.verifiedFields.add(elementIndex);
  }

  isFieldVerified(elementIndex) {
    return this.verifiedFields.has(elementIndex);
  }
}

module.exports = { AgentPlanner };
