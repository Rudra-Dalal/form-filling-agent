# Form-Filling Agent (EIGI AI Project — Phase 1 + Phase 2)

> **Desktop AI agent that reads documents (PDF, DOCX, XLSX) and fills web forms using a visible Playwright Chromium browser, verifying each field in the live DOM, handling multi-step forms, dynamic fields, radio/checkbox intelligence, file attachments, and strictly stopping at `READY_FOR_REVIEW` without ever submitting the form.**

---

## 1. Project Overview & Problem Statement

Form-filling across admission, enrollment, and administrative portals is repetitive, error-prone, and time-consuming. Automated solutions often fail because:
1. Documents arrive in disparate formats (Word, Excel, PDF) with inconsistent labeling.
2. Forms contain multi-step wizards, conditional/dynamic fields, radio button groups, consent declarations, and file upload requirements.
3. Automated tools risk making accidental or unauthorized submissions.

The **Form-Filling Agent** solves these challenges by combining:
- **Document Intelligence**: Standardizing input documents into canonical structured data (`student`, `parent`, `address`).
- **Visual Web Automation**: Controlling a visible Chromium instance via Playwright using an injected numbered set-of-marks representation.
- **Phase-2 Advanced Capabilities**: Multi-step wizard traversal, dynamic field detection, radio group matching, consent checkbox isolation, native file uploads, and single-attempt bounded error recovery.
- **Multi-Layer Safety Engine**: Strict policy engine and DOM-level submission blockers that ensure the agent **NEVER** submits a form under any circumstances. The terminal state is always **`READY_FOR_REVIEW`**, leaving the browser open for human inspection and final submission.

---

## 2. Core Architectural Principle

```
┌────────────────────────────────────────────────────────┐
│         The AGENT decides WHAT should happen.          │
│        The TOOL/LAYER decides HOW it happens.          │
│    The POLICY ENGINE enforces WHAT IS NEVER ALLOWED.   │
└────────────────────────────────────────────────────────┘
```

- **The Agent (Planner)**: Evaluates semantic mappings between document data and DOM elements; never touches raw selectors or locators directly.
- **The Policy Engine**: Acts as an immutable safety boundary between the agent and the browser. Any tool call matching submission keywords or unauthorized consent checkboxes is intercepted and rejected with a `SafetyViolationError`.
- **The Browser Layer**: Executes Playwright actions (`fill_text`, `select_option`, `set_radio`, `set_checkbox`, `upload_file`, `click_navigation`), inspects live DOM state, and performs strict post-fill verification.
- **The Document Layer**: Parses PDF, DOCX, and XLSX files, normalizes fields into canonical keys, and detects ambiguities (such as differing permanent and correspondence addresses).
- **The Desktop UI**: Built with Electron, React 19, TypeScript, and Vite. Streams live status logs, provides interactive user clarification prompts, and allows live pause, resume, and human takeover.

---

## 3. System Architecture

```
+---------------------------------------------------------------------------------+
|                               ELECTRON DESKTOP APP                              |
|                                                                                 |
|   +---------------------------------------+    +-----------------------------+  |
|   |          REACT 19 + VITE UI           |    |     ELECTRON MAIN PROCESS   |  |
|   |  - Document Selector & Field Viewer   |IPC |  - App Lifecycle            |  |
|   |  - Target Form URL & Mode Selector    |<==>|  - Window Manager           |  |
|   |  - Live Activity Stream & Verification|    |  - Preload Context Bridge   |  |
|   |  - Pause / Resume / Takeover / Clarify|    |  - IPC Bridge Handlers      |  |
|   +---------------------------------------+    +--------------+--------------+  |
+---------------------------------------------------------------|-----------------+
                                                                | (WebSocket / IPC)
                                                                v
+---------------------------------------------------------------------------------+
|                          PYTHON FASTAPI & PLAYWRIGHT CORE                       |
|                                                                                 |
|   +-------------------+      +-------------------+      +-------------------+   |
|   |  DOCUMENT LAYER   |      |   AGENT ENGINE    |      |   POLICY ENGINE   |   |
|   |  - DOCX Parser    |      |  - AgentSession   |      |  - Submit Blocker |   |
|   |  - XLSX Parser    |=====>|  - AgentPlanner   |=====>|  - Consent Filter |   |
|   |  - PDF Parser     |      |  - ToolExecutor   |      |  - State Guard    |   |
|   |  - Normalizer     |      |  - Claude Client  |      +---------+---------+   |
|   +-------------------+      +-------------------+                |             |
|                                                                   v             |
|   +-------------------------------------------------------------------------+   |
|   |                           BROWSER AUTOMATION LAYER                      |   |
|   |  - Playwright Async Chromium Session (Visible Browser Window)           |   |
|   |  - Injected DOM Inspector (Set-of-Marks Numbered Badging)               |   |
|   |  - Semantic Field Mapper & Synonym Matcher (with Roman Numeral Support)  |   |
|   |  - Action Executors (fill, select, radio, checkbox, file, navigation)  |   |
|   |  - Live DOM Verifier (DOM-read comparison post-action)                  |   |
|   +-------------------------------------------------------------------------+   |
+---------------------------------------------------------------------------------+
```

---

## 4. Phase-1 & Phase-2 Feature Matrix

| Capability | Phase 1 (Baseline) | Phase 2 (Advanced Automation) | Status |
| :--- | :--- | :--- | :--- |
| **Document Formats** | PDF, DOCX, XLSX | Heterogeneous schemas, dynamic tables, date variations | **Complete** |
| **Form Perception** | Visible text, selects, checkboxes | Set-of-Marks DOM badges, radio groups, file inputs, wizard steps | **Complete** |
| **Multi-Step Forms** | Single-page forms | Automated wizard progression via `click_navigation` (`NAVIGATION_NEXT`) | **Complete** |
| **Dynamic Fields** | Static forms | Dynamic dependent field discovery (`DYNAMIC_FIELD_DETECTED`) | **Complete** |
| **Radio Buttons** | Basic checkboxes | Semantic radio group selection with exact & whole-word matching | **Complete** |
| **Checkboxes & Consent** | Unfiltered checkboxes | Automatic separation: standard inputs filled, consent/legal boxes blocked | **Complete** |
| **File Uploads** | Out of scope | Native Playwright file attachment via `upload_file` | **Complete** |
| **Field Verification** | DOM re-read verification | Value normalization (dates, phone numbers, Roman numerals) | **Complete** |
| **Error Recovery** | Immediate fail on mismatch | Bounded single-attempt recovery (`clear_field` -> re-fill -> re-verify) | **Complete** |
| **Human Collaboration** | Pause, resume, clarify | Full Human Takeover (`hand_over_to_user` -> browser control -> `give_back`) | **Complete** |
| **Submission Safety** | Submit tool omitted | Multi-layer defense: Policy Engine, DOM keyword regex, zero-submit invariant | **Guaranteed** |
| **Terminal State** | `READY_FOR_REVIEW` | `READY_FOR_REVIEW` (Browser remains open for user review and submission) | **Guaranteed** |

---

## 5. Absolute Invariant: Submission Safety

> [!IMPORTANT]
> **THE AGENT MUST NEVER SUBMIT A FORM.**
> **`READY_FOR_REVIEW` is the terminal success state and the agent cannot submit forms.**

Submission safety is enforced through multiple redundant layers:
1. **Tool Registry**: No `submit_form` or submission tool is registered in the tool definitions.
2. **Policy Engine**: Evaluates every planned action against state and element classifications. Any action targeting a control classified as `SUBMISSION` is immediately blocked.
3. **Regex Keyword Filter**: Scans element text, labels, IDs, names, and ARIA attributes for over 40 submit-intent variations:
   ```regex
   submit|apply|finalize|confirm|pay|place order|send application|
   complete registration|finish application|register now|file now|
   make payment|complete purchase|checkout
   ```
4. **Action-Level DOM Verification**: `click_element` inspects the live DOM element attributes before dispatching a click. If the target is an input/button of `type="submit"` or contains submission keywords, a `SafetyViolationError` is raised.
5. **Form Submission Interception**: Injected browser scripts intercept `form.submit()` and button click events to prevent default submission.
6. **Open Browser at Terminal State**: Upon completing all available steps and fields, the agent transitions to `READY_FOR_REVIEW`, produces a human-readable summary, and leaves the visible Chromium browser open for manual user inspection and manual submission.

---

## 6. Test Fixture Matrix

The repository contains 12 dedicated HTML fixtures in `tests/fixtures/` exercising every real-world form condition:

| Fixture File | Scenario Tested | Key Verification Criterion |
| :--- | :--- | :--- |
| `01-basic-form.html` | Standard text, date, and dropdown fields | All fields filled and verified via DOM inspection |
| `02-label-variants.html` | Diverse label synonyms (e.g. "Candidate Name", "D.O.B.") | Semantic mapper correctly resolves aliases to canonical fields |
| `03-missing-field.html` | Document missing expected fields (e.g. mother name) | Missing fields safely skipped; no placeholder hallucination |
| `04-ambiguous-address.html` | Conflicting addresses (Permanent vs Correspondence) | Triggers `ASK_USER`; rejects invalid answers, proceeds when clarified |
| `05-multi-step.html` | 3-step admission wizard with "Next Step" buttons | Traverses Steps 1, 2, and 3; fills each step, stops before final submit |
| `06-dynamic-fields.html` | Dependent fields appearing upon parent selection | Emits `DYNAMIC_FIELD_DETECTED`; dynamically maps and fills new fields |
| `07-radio-form.html` | Mutually exclusive radio button groups | Selects appropriate radio button (Female) without substring bugs |
| `08-checkbox-form.html` | Standard options vs legal/consent checkboxes | Transports option filled; declaration checkbox strictly un-checked |
| `09-file-upload.html` | Document and photo file input controls | `upload_file` attaches document path; DOM verifies file attachment |
| `10-submission-attempt.html` | Adversarial form with multiple deceptive submit buttons | Policy Engine and detector block every submit attempt |
| `11-human-takeover.html` | CAPTCHA / security challenge requiring user intervention | Agent enters `HUMAN_TAKEOVER`, yields browser, resumes upon give-back |
| `12-verification-failure.html` | Field validation error (e.g., read-only or script-altered input) | Executes bounded recovery; reports verification mismatch gracefully |

---

## 7. Project Structure

```
form-filling-agent/
|-- backend/                       # Python FastAPI + Playwright backend
|   |-- app/
|   |   |-- agent/                 # Agent session, planner, and executor
|   |   |   |-- session.py         # Main execution loop & lifecycle state machine
|   |   |   |-- planner.py         # Fill plan generator with radio & file intelligence
|   |   |   |-- executor.py        # Action dispatcher
|   |   |   `-- prompt.py          # Strict safety system prompts
|   |   |-- browser/               # Browser automation & DOM perception
|   |   |   |-- browser.py         # Playwright Chromium manager
|   |   |   |-- inspector.py       # Injected set-of-marks & visibility script
|   |   |   |-- detector.py        # Control classifier & submission keyword filter
|   |   |   |-- mapper.py          # Semantic label mapper & Roman numeral normalizer
|   |   |   |-- actions.py         # Primitives: fill, select, radio, checkbox, file, click
|   |   |   `-- verifier.py        # Post-fill live DOM verifier
|   |   |-- document/              # Document extraction pipeline
|   |   |   |-- extractor.py       # Document processing pipeline
|   |   |   |-- normalizer.py      # Canonical schema normalizer
|   |   |   `-- parsers/           # DOCX, XLSX, and PDF parsers
|   |   |-- policy/                # Invariant & safety enforcement
|   |   |   `-- engine.py          # PolicyEngine blocking submits and unpermitted tools
|   |   |-- registry/              # Permitted tool registry
|   |   |   `-- definitions.py     # Anthropic tool schemas (no submit_form)
|   |   |-- schemas/               # Pydantic data models
|   |   `-- config.py              # Centralized environment configuration
|   `-- tests/                     # 38 pytest test suites
|
|-- electron/                      # Electron desktop shell
|   |-- main.js                    # Application lifecycle & window creation
|   |-- preload.js                 # Context-isolated secure IPC bridge
|   `-- ipc/                       # Modular IPC handlers
|
|-- src/                           # Frontend UI & JavaScript baseline
|   |-- renderer/                  # React 19 + TypeScript desktop UI
|   |   |-- src/
|   |   |   |-- App.tsx            # Main application coordinator
|   |   |   |-- types.ts           # Frontend TypeScript interfaces
|   |   |   `-- index.css          # Design system & dark mode styles
|   |   `-- index.html
|   `-- browser/                   # Shared browser inspection scripts
|
|-- tests/
|   |-- fixtures/                  # 12 HTML form fixtures & sample documents
|   `-- run-all.js                 # Node.js baseline test runner (25 tests)
|
|-- .env.example                   # Environment configuration template
|-- package.json                   # Project dependencies & build scripts
|-- tsconfig.json                  # TypeScript compiler configuration
|-- vite.config.ts                 # Vite bundler configuration
`-- README.md                      # Comprehensive documentation
```

---

## 8. Installation & Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.10 or higher
- **Chromium**: Managed automatically by Playwright

### Step 1: Install Node Dependencies
```bash
npm install
```

### Step 2: Set Up Python Virtual Environment
```bash
python -m venv .venv

# On Windows:
.\.venv\Scripts\activate

# On macOS/Linux:
source .venv/bin/activate

pip install -r backend/requirements.txt
playwright install chromium
```

### Step 3: Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(Optional: Provide `ANTHROPIC_API_KEY` for Claude-driven execution. If omitted, the agent operates in deterministic offline dry-run mode).*

---

## 9. Development & Verification Workflows

### 1. Run Complete Test Suites

Execute both test suites to verify full Phase-1 and Phase-2 compliance:

```bash
# Run 38 Python backend tests (Policy Engine, Agent, Browser, Document, Multi-step, Radios)
.\.venv\Scripts\pytest backend/tests -v

# Run 25 JavaScript baseline tests
npm test
```

### 2. Verify TypeScript Compilation & UI Build
```bash
# TypeScript strict typecheck
npx tsc --noEmit

# Compile production React UI bundle with Vite
npm run build:ui
```

### 3. Launch Desktop Application
```bash
npm run dev
# or
npm start
```

---

## 10. Packaging & Distribution Status

- **Development Mode**: Fast iteration using Vite HMR and local Python virtual environment (`.venv`).
- **Production Distribution**: When packaging the desktop app using `electron-builder`, the Python FastAPI backend can be bundled as a frozen standalone executable sidecar using PyInstaller:
  ```bash
  pyinstaller --onefile --name form-agent-backend backend/app/main.py
  ```
  The Electron main process detects packaged mode and spawns the bundled binary without requiring a host Python installation.

---

## 11. License

MIT License. See [LICENSE](LICENSE) for details.
