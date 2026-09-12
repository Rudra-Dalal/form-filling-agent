/**
 * Agent actions and session schema definitions.
 */

function validateAgentAction(action) {
  const errors = [];
  if (!action || typeof action !== 'object') {
    return { valid: false, errors: ['Agent action must be an object'] };
  }
  if (!action.action || typeof action.action !== 'string') {
    errors.push('Agent action must have an "action" name string');
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validateAgentAction,
};
