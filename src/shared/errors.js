class AppError extends Error {
  constructor(message, code) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
  }
}

/** Document could not be read or parsed (unsupported type, corrupt file, etc). */
class DocumentParseError extends AppError {
  constructor(message) {
    super(message, 'DOCUMENT_PARSE_ERROR');
  }
}

/** The LLM extraction step returned unusable or unparseable output. */
class ExtractionError extends AppError {
  constructor(message) {
    super(message, 'EXTRACTION_ERROR');
  }
}

/** A Playwright/browser action failed (element not found, navigation failed, etc). */
class BrowserActionError extends AppError {
  constructor(message) {
    super(message, 'BROWSER_ACTION_ERROR');
  }
}

/** The agent loop hit a boundary it should never cross (e.g. attempted submit). */
class SafetyViolationError extends AppError {
  constructor(message) {
    super(message, 'SAFETY_VIOLATION');
  }
}

module.exports = {
  AppError,
  DocumentParseError,
  ExtractionError,
  BrowserActionError,
  SafetyViolationError,
};
