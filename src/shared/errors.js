/**
 * Domain-specific error classes for error classification and graceful handling.
 */

class AgentError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'AgentError';
    this.details = details;
  }
}

class BrowserError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'BrowserError';
    this.details = details;
  }
}

class DocumentParseError extends Error {
  constructor(message, filePath = null) {
    super(message);
    this.name = 'DocumentParseError';
    this.filePath = filePath;
  }
}

class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

module.exports = {
  AgentError,
  BrowserError,
  DocumentParseError,
  ValidationError,
};
