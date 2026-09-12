/**
 * Formats the initial prompt provided to the agent for a form-filling task.
 */

function buildInitialTaskPrompt({ instruction, targetUrl, documentData }) {
  return [
    `Instruction: ${instruction}`,
    `Target URL: ${targetUrl}`,
    `Document data (JSON):\n${JSON.stringify(documentData, null, 2)}`,
  ].join('\n\n');
}

module.exports = {
  buildInitialTaskPrompt,
};
