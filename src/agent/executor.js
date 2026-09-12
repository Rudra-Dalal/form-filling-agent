const { AGENT_EVENTS } = require('../shared/events');

/**
 * Tool execution dispatcher. Routes agent-selected tool requests to the appropriate
 * browser, document, or user collaboration services.
 */
class ToolExecutor {
  /**
   * @param {Object} options
   * @param {import('../browser/browser').BrowserSession} options.browserSession
   * @param {import('./verifier').FormVerifier} options.verifier
   * @param {import('./planner').AgentPlanner} options.planner
   * @param {Function} options.emit
   * @param {Function} options.askUser
   * @param {Function} options.handOverToUser
   * @param {Object} options.documentData
   */
  constructor({ browserSession, verifier, planner, emit, askUser, handOverToUser, documentData }) {
    this.browserSession = browserSession;
    this.verifier = verifier;
    this.planner = planner;
    this.emit = emit;
    this.askUser = askUser;
    this.handOverToUser = handOverToUser;
    this.documentData = documentData || {};
  }

  /**
   * Executes a tool block from the LLM response.
   * @param {{ name: string, input: any }} toolUse
   * @returns {Promise<{ ok: boolean, [key: string]: any }>}
   */
  async execute(toolUse) {
    const { name, input } = toolUse;
    this.emit(AGENT_EVENTS.TOOL_CALL, { name, input });

    try {
      switch (name) {
        // --- Browser Tools ---
        case 'read_form':
        case 'get_page_snapshot': {
          const snapshot = await this.browserSession.readForm();
          this.emit(AGENT_EVENTS.FORM_SNAPSHOT, { snapshot });
          return { ok: true, elements: snapshot };
        }

        case 'click': {
          await this.browserSession.click(input.element_index);
          return { ok: true };
        }

        // --- Form Interaction Tools ---
        case 'fill_text': {
          await this.browserSession.fillText(input.element_index, input.value);
          this.planner.recordFilled(input.element_index);
          this.emit(AGENT_EVENTS.FIELD_FILLED, {
            elementIndex: input.element_index,
            value: input.value,
          });
          return { ok: true };
        }

        case 'clear_field': {
          await this.browserSession.clearField(input.element_index);
          return { ok: true };
        }

        case 'select_option': {
          await this.browserSession.selectOption(input.element_index, input.option_label);
          this.planner.recordFilled(input.element_index);
          this.emit(AGENT_EVENTS.FIELD_FILLED, {
            elementIndex: input.element_index,
            value: input.option_label,
          });
          return { ok: true };
        }

        case 'set_checkbox': {
          await this.browserSession.setCheckbox(input.element_index, input.checked);
          this.planner.recordFilled(input.element_index);
          this.emit(AGENT_EVENTS.FIELD_FILLED, {
            elementIndex: input.element_index,
            value: input.checked,
          });
          return { ok: true };
        }

        case 'read_field': {
          const snapshot = await this.browserSession.readForm();
          const field = snapshot.find((el) => el.index === input.element_index);
          return { ok: true, field: field || null };
        }

        case 'verify_field': {
          const result = await this.browserSession.verifyField(
            input.element_index,
            input.expected_value
          );
          this.verifier.recordVerification(
            input.element_index,
            input.expected_value,
            result.actual,
            result.matches
          );
          if (result.matches) {
            this.planner.recordVerified(input.element_index);
          }
          this.emit(AGENT_EVENTS.FIELD_VERIFIED, {
            elementIndex: input.element_index,
            expected: input.expected_value,
            actual: result.actual,
            matches: result.matches,
          });
          return { ok: true, matches: result.matches, actual: result.actual };
        }

        // --- Document Tools ---
        case 'read_document': {
          return { ok: true, documentData: this.documentData };
        }

        case 'extract_document_fields': {
          const cat = input.category || 'all';
          if (cat === 'all') return { ok: true, data: this.documentData };
          return { ok: true, data: this.documentData[cat] || null };
        }

        // --- User Interaction Tools ---
        case 'ask_user': {
          const answer = await this.askUser(input.question, input.context);
          return { ok: true, answer };
        }

        case 'request_takeover': {
          await this.handOverToUser(input.reason);
          return { ok: true, status: 'handed_over_to_user' };
        }

        case 'task_complete': {
          this.emit(AGENT_EVENTS.COMPLETED, { summary: input.summary });
          return { ok: true, summary: input.summary };
        }

        default:
          return { ok: false, error: `Unknown tool: ${name}` };
      }
    } catch (err) {
      this.emit(AGENT_EVENTS.TOOL_ERROR, { name, message: err.message });
      return { ok: false, error: err.message };
    }
  }
}

module.exports = { ToolExecutor };
