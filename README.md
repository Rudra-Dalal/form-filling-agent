# Form-Filling Agent (EIGI AI Project)

> **Desktop AI agent that reads student documents (PDF, DOCX, XLSX) and fills web forms using Playwright, verifying each field, asking for human clarification when needed, and stopping safely before form submission.**

---

## 1. Project Purpose & Problem Statement

Form-filling across school, college, and administrative portals is repetitive, error-prone, and time-consuming. However, full end-to-end automation often fails when documents have varying formats or when forms have slight label differences (e.g., `"DOB"` vs `"Date of Birth"`).

The **Form-Filling Agent** addresses this problem by combining:
1. **Document Intelligence**: Parsing heterogeneous document formats (PDF, Word, Excel) and extracting structured student/parent/address data.
2. **Visual Web Automation**: Controlling a visible Chromium browser with Playwright using a numbered set-of-marks interactive DOM representation.
3. **Reasoned Field Matching**: Using an LLM to semantically match document fields to form controls instead of brittle hardcoded selectors.
4. **Active Verification & Safety**: Verifying every field value on the live web page post-fill, asking the human user for clarification on ambiguity, and **strictly never submitting the form**.

---

## 2. Architectural Principle

The system adheres to a strict architectural rule:

```
┌────────────────────────────────────────────────────────┐
│         The AGENT decides WHAT should happen.          │
│        The TOOL/LAYER decides HOW it happens.          │
└────────────────────────────────────────────────────────┘
```

- **The Agent** never touches Playwright locators, never executes raw selectors, and never directly accesses the filesystem.
- **The Browser Layer** owns all Playwright interactions (fill, select, check, verify, navigate).
- **The Document Layer** owns file parsing (pdf-parse, mammoth, xlsx) and data normalization.
- **The Tools Layer** provides a controlled, safe API to the agent (no arbitrary computer control or terminal execution).
- **The Electron Shell** provides desktop security, isolated renderer context, and asynchronous IPC streaming.

---

## 3. High-Level Architecture Diagram

```
+-------------------------------------------------------------------------+
|                        ELECTRON DESKTOP SHELL                           |
|                                                                         |
|  +---------------------------+           +---------------------------+  |
|  |       UI / RENDERER       |           |       MAIN PROCESS        |  |
|  |  (Vanilla HTML/CSS/JS)    |           |  - App Lifecycle          |  |
|  |  - Document Upload        |   IPC     |  - BrowserWindow Service  |  |
|  |  - Task Configuration     |<=========>|  - Document IPC Handler   |  |
|  |  - Live Activity Log      | (Preload) |  - Agent IPC Handler      |  |
|  |  - Pause / Resume / Takeover          |  - Browser IPC Handler    |  |
|  +---------------------------+           +-------------+-------------+  |
+--------------------------------------------------------|----------------+
                                                         |
                                                         v
                                           +-------------+-------------+
                                           |        AGENT LAYER        |
                                           |  - AgentSession Loop      |
                                           |  - AgentPlanner           |
                                           |  - FormVerifier           |
                                           |  - ToolExecutor           |
                                           |  - Claude LLM Client      |
                                           +-------------+-------------+
                                                         |
                         +-------------------------------+-------------------------------+
                         |                               |                               |
                         v                               v                               v
           +-------------+-------------+   +-------------+-------------+   +-------------+-------------+
           |      DOCUMENT TOOLS       |   |       BROWSER TOOLS       |   |        USER TOOLS         |
           |  - read_document          |   |  - read_form              |   |  - ask_user               |
           |  - extract_document_fields|   |  - fill_text              |   |  - request_takeover       |
           +-------------+-------------+   |  - select_option          |   |  - task_complete          |
                         |                 |  - set_checkbox           |   +-------------+-------------+
                         |                 |  - verify_field           |                 |
                         v                 +-------------+-------------+                 v
           +-------------+-------------+                 |                 +-------------+-------------+
           |      DOCUMENT LAYER       |                 v                 |     USER COLLABORATION    |
           |  - Extractor Coordinator  |   +-------------+-------------+   |  - Blocking Clarification |
           |  - Normalizer (Canonical) |   |       BROWSER LAYER       |   |  - Pause / Resume         |
           |  - PDF / DOCX / XLSX      |   |  - Playwright Controller  |   |  - Human Takeover         |
           +---------------------------+   |  - Injected DOM Inspector |   +---------------------------+
                                           |  - Form Field Detector    |
                                           |  - Semantic Field Mapper  |
                                           |  - Live Field Verifier    |
                                           +---------------------------+
```

---

## 4. Phase 1 Execution Workflow

```
[ Upload Document ]
        |
        v
[ Parse & Normalize Fields ] (PDF, DOCX, XLSX -> student, parent, address)
        |
        v
[ Launch Visible Chromium ] (Playwright)
        |
        v
[ Navigate to Form URL ]
        |
        v
[ Inspect & Number Form Elements ] (Set-of-marks approach)
        |
        v
[ Semantically Match & Fill Fields ] (Text, Select, Checkbox)
        |
        v
[ Verify Values Post-Fill ] (Re-reads page DOM & compares)
        |
   +----+----+
   | Ambiguity?
   +----+----+
   /         \
 [YES]       [NO]
  |            |
[Ask User]     |
  |            |
  +------>-----+
        |
        v
[ Form Filled & Verified ]
        |
        v
[ STOP -> Ready for Human Review ]  <--- (PHASE 1 TERMINATION)
        |
    (NEVER SUBMIT)
```

---

## 5. Folder Structure

```
form-filling-agent/
|
|-- electron/
|   |-- main.js                      # Application lifecycle & bootstrap
|   |-- preload.js                   # Secure contextBridge API for renderer
|   |-- ipc/
|   |   |-- agent.ipc.js             # Agent lifecycle IPC (start, pause, resume, takeover, answer)
|   |   |-- document.ipc.js          # Document picker & parsing IPC
|   |   `-- browser.ipc.js           # Browser state & snapshot IPC
|   `-- services/
|       `-- window.service.js        # BrowserWindow manager & renderer event forwarder
|
|-- src/
|   |-- ui/
|   |   |-- index.html               # Semantic UI markup
|   |   |-- app.js                   # UI coordinator & bootstrap
|   |   |-- styles.css               # Clean dark-mode CSS styles
|   |   |-- components/
|   |   |   |-- document-upload.js   # Document picker & extracted fields view
|   |   |   |-- task-input.js        # Target URL & instruction form controls
|   |   |   |-- agent-status.js      # Status badge & execution state indicator
|   |   |   |-- activity-log.js      # Real-time event log with timestamps & icons
|   |   |   `-- controls.js          # Pause/Resume, Takeover/Give-back, and Ask-User dialog
|   |   `-- state/
|   |       `-- task-state.js        # Reactive UI state store
|   |
|   |-- agent/
|   |   |-- agent.js                 # AgentSession orchestrator loop
|   |   |-- planner.js               # Decides next logical action
|   |   |-- executor.js              # Dispatches tool execution to underlying layers
|   |   |-- verifier.js              # Agent-level verification logic
|   |   |-- llm-client.js            # Anthropic client singleton
|   |   |-- tools/
|   |   |   |-- document.tools.js    # Document inspection tools
|   |   |   |-- browser.tools.js     # Page inspection tools
|   |   |   |-- form.tools.js        # Form interaction tools (fill, select, check, verify)
|   |   |   |-- user.tools.js        # User collaboration tools (ask_user, task_complete)
|   |   |   `-- index.js             # Aggregated toolset exporter
|   |   |-- prompts/
|   |   |   |-- system.prompt.js     # System instructions and boundaries
|   |   |   `-- form-filling.prompt.js # Form filling task prompt formatter
|   |   `-- schemas/
|   |       |-- agent.schema.js      # Action & session data schemas
|   |       |-- document.schema.js   # Normalized document schemas (student, parent, address)
|   |       `-- form.schema.js       # Detected form element schemas
|   |
|   |-- document/
|   |   |-- extractor.js             # Extractor orchestrator (file reading + LLM extraction)
|   |   |-- normalizer.js            # Normalizes fields into canonical schema
|   |   `-- parsers/
|   |       |-- pdf.parser.js        # PDF parser (pdf-parse)
|   |       |-- docx.parser.js       # DOCX parser (mammoth)
|   |       `-- xlsx.parser.js       # XLSX/XLS parser (xlsx)
|   |
|   |-- browser/
|   |   |-- browser.js               # Playwright browser, context & page lifecycle
|   |   |-- page-inspector.js        # Injected DOM script (set-of-marks extraction)
|   |   |-- form-detector.js         # Form element classification & metadata extractor
|   |   |-- field-mapper.js          # Semantic mapping between document & form fields
|   |   |-- actions.js               # Playwright action primitives (fill, select, check, click)
|   |   `-- verifier.js              # Post-fill verification (re-reads & compares values)
|   |
|   `-- shared/
|       |-- types.js                 # JSDoc type definitions
|       |-- constants.js             # Shared system constants & limits
|       |-- events.js                # Canonical event names for IPC & agent
|       `-- errors.js                # Custom error hierarchy
|
|-- tests/
|   |-- document/
|   |   `-- document.test.js         # Document parser & normalization tests
|   |-- agent/
|   |   `-- agent.test.js            # Tool definitions, schemas, no-submit safety tests
|   |-- browser/
|   |   `-- browser.test.js          # Control classifier, mapper, verifier tests
|   |-- integration/
|   |   `-- workflow.test.js         # End-to-end AgentSession lifecycle tests
|   `-- run-all.js                   # Test runner using Node.js built-in test runner
|
|-- assets/
|   `-- icons/
|       `-- README.md                # Icons placeholder
|-- .env.example                     # Environment template
|-- .gitignore                       # Git ignore configuration
|-- LICENSE                          # MIT License
|-- package.json                     # Project manifest & scripts
`-- README.md                        # Documentation
```

---

## 6. Detailed Layer Explanations

### Electron Main (`electron/main.js`, `electron/services/`, `electron/ipc/`)
- Runs in privileged Node.js environment.
- Initializes application lifecycle, creates `BrowserWindow` via `WindowService`, and registers modular IPC handlers (`agent.ipc.js`, `document.ipc.js`, `browser.ipc.js`).
- Contains **no AI agent logic** or business rules.

### Electron Preload (`electron/preload.js`)
- Runs with `contextIsolation: true` and `nodeIntegration: false`.
- Exposes only safe, white-listed functions to the renderer window via `contextBridge`:
  - `window.agentAPI.pickAndParseDocument()`
  - `window.agentAPI.startAgent(payload)`
  - `window.agentAPI.pauseAgent()`
  - `window.agentAPI.resumeAgent()`
  - `window.agentAPI.takeOver()`
  - `window.agentAPI.giveBack()`
  - `window.agentAPI.answerPrompt(promptId, answer)`
  - `window.agentAPI.onAgentEvent(callback)`

### UI Layer (`src/ui/`)
- Standard Vanilla HTML, CSS, and modular JS components.
- Completely decoupled from Playwright and Node.js.
- Communicates exclusively through the preload bridge (`window.agentAPI` / `window.eigiAgent`).
- Maintains reactive local state via `task-state.js`.

### Agent Layer (`src/agent/`)
- The cognitive core.
- Drives the tool-use loop with Claude:
  1. Calls `read_form` to perceive the form.
  2. Selects actions based on the document data and user instruction.
  3. Executes actions through `ToolExecutor`.
  4. Verifies actions through `FormVerifier`.
  5. Asks the human user when clarification is needed through `ask_user`.
  6. Concludes with `task_complete` summary.

### Tools Layer (`src/agent/tools/`)
- Explicit tool declarations following the Anthropic Tool-Use standard.
- Split into:
  - `document.tools.js`: `read_document`, `extract_document_fields`
  - `browser.tools.js`: `read_form`, `get_page_snapshot`, `click`
  - `form.tools.js`: `fill_text`, `select_option`, `set_checkbox`, `read_field`, `verify_field`
  - `user.tools.js`: `ask_user`, `request_takeover`, `task_complete`
- **Safety Guarantee**: There is NO `submit_form` tool.

### Document Layer (`src/document/`)
- Handles file I/O and format-specific extraction:
  - PDF via `pdf-parse`
  - DOCX via `mammoth`
  - XLSX/XLS via `xlsx`
- Standardizes diverse source documents into a canonical schema:
  ```json
  {
    "student": { "fullName": "...", "dateOfBirth": "...", "gender": "..." },
    "parent": { "fatherName": "...", "motherName": "...", "contactNumber": "..." },
    "address": { "street": "...", "city": "...", "state": "...", "pincode": "..." }
  }
  ```

### Browser Layer (`src/browser/`)
- Encapsulates Playwright.
- Injects `COLLECT_ELEMENTS_SCRIPT` into the page to build a numbered snapshot (`window.__agentElements`) using a set-of-marks technique.
- Classifies controls (`form-detector.js`), scores semantic matches (`field-mapper.js`), executes input actions (`actions.js`), and verifies DOM values (`verifier.js`).

---

## 7. Scope & Boundaries (Phase 1)

### Included in Phase 1:
- Visible Chromium window launch (`headless: false`).
- Parsing PDF, DOCX, and XLSX documents.
- Semantic field matching and filling of text inputs, textareas, dropdown selects, and checkboxes/radios.
- Value verification after every fill operation.
- Real-time event streaming to the desktop UI.
- Interactive user clarification for missing or conflicting document data.
- Interactive user clarification for missing or conflicting document data.
- Live pause, resume, and human takeover/give-back controls.
- Safe termination state: `"Form filled, verified, and ready for human review."`
- Hybrid execution: Claude LLM mode when API key is provided, or deterministic dry-run mode for local offline validation.

### Explicitly Excluded from Phase 1:
- **No Form Submission**: The agent must never click "Submit", "Apply", or finalize payment. Any attempt to click a submit-intent button throws `SafetyViolationError`.
- **No Unrelated Navigation**: The agent cannot browse arbitrary websites.
- **No Arbitrary System Control**: The agent cannot execute shell commands or access arbitrary files.

---

## 8. Installation & Setup

### Prerequisites
- Node.js (v18 or higher recommended; v20+ automatically loads `.env`)
- Chromium browser dependencies (installed automatically via Playwright postinstall)
- Anthropic Claude API Key (optional for deterministic dry-run mode; required for LLM reasoning)

### Step 1: Install Dependencies
```bash
npm install
```
*(The postinstall script automatically installs Playwright's Chromium binary.)*

### Step 2: Configure Environment (Optional for dry run)
Create a `.env` file in the project root:
```bash
cp .env.example .env
```
Add your API key:
```env
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
```
*(When present, `.env` is loaded automatically by Electron without third-party dependencies.)*

---

## 9. Running the Application

To launch the desktop application:
```bash
npm start
# or
npm run dev
```

### End-to-End Fixture Dry Run (Zero-Config Test)
You can test the entire document extraction, browser navigation, field mapping, filling, and verification pipeline without an API key using the included test fixtures:

1. Launch the app: `npm start`
2. Click **"Choose Document..."** and select:
   `tests/fixtures/sample-admission-record.docx`
3. In **Target Form URL**, enter the local file URL for the sample form:
   `file:///D:/CODER%20HI%20KEHDE/Projects/form-filling-agent/tests/fixtures/sample-registration-form.html`
   *(or copy the file's path into your browser to get the exact file:// URL)*
4. Keep the instruction: `Read this document and fill the student registration form.`
5. Ensure **"Deterministic Dry Run"** is checked (if running without an API key).
6. Click **"Start Form-Filling Agent"**.
7. Watch the visible Chromium window open, inspect the form, fill each field, verify every value, leave the unmapped hostel checkbox untouched, ignore the submit button, and reach **READY FOR REVIEW**.

---

## 10. Running Tests & Architecture Validation

The repository includes dual test suites validating both the Electron/JS baseline and the Python FastAPI backend:

### 1. JavaScript Baseline Tests (25 Tests)
```bash
npm test
```
- **Document Suite** (`tests/document/document.test.js`): PDF/DOCX/XLSX parsing, canonical normalization, date normalization, ambiguity warnings, schema validation.
- **Agent Suite** (`tests/agent/agent.test.js`): Tool definitions, system prompt rules, action schema validation, strict `submit_form` omission invariant.
- **Browser Suite** (`tests/browser/browser.test.js`): Control classifier, filter fillable fields, semantic field mapper scoring and synonyms, FormVerifier tracking.
- **Browser Actions Suite** (`tests/browser/actions.test.js`): Playwright text filling, clearField, selectOption (case-insensitive & label/value), setCheckbox, verifyField with date/whitespace normalization, and strict `SafetyViolationError` when clicking submit buttons.
- **Agent Integration Suite** (`tests/integration/workflow.test.js`): `AgentSession` lifecycle test with mock LLM (pause/resume, takeover, ask_user round-trip, completion).
- **Fixture Dry-Run Integration Suite** (`tests/integration/fixture-dryrun.test.js`): Full end-to-end integration test reading `sample-admission-record.docx` and filling `sample-registration-form.html` in a real browser session.

### 2. Python FastAPI Backend Tests (28 Tests)
```bash
npm run test:backend
# or: .\.venv\Scripts\pytest backend/tests
```
- **Document Suite** (`backend/tests/document/test_document.py`): Word docx parser, PDF parser, Excel parser, canonical schema validator.
- **Browser Suite** (`backend/tests/browser/test_browser.py`, `backend/tests/browser/test_actions.py`): Form element detector, Playwright action execution, live element verifier.
- **Tools & Policy Engine** (`backend/tests/registry/test_tools.py`, `backend/tests/policy/test_policy.py`, `backend/tests/policy/test_final_safety.py`): ToolRegistry verification, PolicyEngine state machine, invariant enforcement rejecting submit-intent elements (`SafetyViolationError`).
- **Agent & Workflow** (`backend/tests/agent/test_agent.py`, `backend/tests/integration/test_workflow.py`, `backend/tests/integration/test_fixture_dryrun.py`): Agent planner, executor, interactive ask_user round-trip, full fixture dry run.
- **FastAPI Endpoints** (`backend/tests/api/test_api.py`): `/health`, `/documents/parse`, `/sessions` lifecycle.

### 3. Frontend Build
```bash
npm run build:ui
```
Compiles the React + TypeScript frontend into `dist/` using Vite. Electron automatically serves the compiled bundle.

---

## 11. Known Limitations & Future Work (Phase 2)
- Multi-page wizard forms with conditional branching are planned for Phase 2.
- CAPTCHAs require human takeover (supported via the "Take Over Browser" button).
- File uploads directly into target web forms are out of Phase-1 scope.

---

## 12. License

MIT License. See [LICENSE](LICENSE) for details.
