const { DOCUMENT_TOOLS } = require('./document.tools');
const { BROWSER_TOOLS } = require('./browser.tools');
const { FORM_TOOLS } = require('./form.tools');
const { USER_TOOLS } = require('./user.tools');

const ALL_TOOLS = [
  ...DOCUMENT_TOOLS,
  ...BROWSER_TOOLS,
  ...FORM_TOOLS,
  ...USER_TOOLS,
];

module.exports = {
  DOCUMENT_TOOLS,
  BROWSER_TOOLS,
  FORM_TOOLS,
  USER_TOOLS,
  ALL_TOOLS,
  TOOLS: ALL_TOOLS, // alias for backward compatibility
};
