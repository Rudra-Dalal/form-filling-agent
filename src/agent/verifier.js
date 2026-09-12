/**
 * Agent-level verification helper to validate whether fill operations succeeded
 * and provide audit logs.
 */
class FormVerifier {
  constructor() {
    this.verificationLog = [];
  }

  /**
   * Compares expected value with actual on-page value and logs the result.
   * @param {number} elementIndex
   * @param {string|boolean} expected
   * @param {string|boolean} actual
   * @param {boolean} matches
   * @returns {Object}
   */
  recordVerification(elementIndex, expected, actual, matches) {
    const record = {
      elementIndex,
      expected: String(expected),
      actual: actual !== null ? String(actual) : null,
      matches: Boolean(matches),
      timestamp: new Date().toISOString(),
    };
    this.verificationLog.push(record);
    return record;
  }

  /**
   * Returns whether all recorded fields passed verification.
   * @returns {boolean}
   */
  allVerified() {
    return (
      this.verificationLog.length > 0 &&
      this.verificationLog.every((entry) => entry.matches)
    );
  }

  getLog() {
    return [...this.verificationLog];
  }
}

module.exports = { FormVerifier };
