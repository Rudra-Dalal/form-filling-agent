# Test Fixtures — End-to-End Dry Run

Two files to exercise the full pipeline (document → extraction → browser fill →
verify → ask_user) without touching a real school website:

- **`sample-admission-record.docx`** — a source document, structured like a
  real admission record.
- **`sample-registration-form.html`** — a target form with labels phrased
  differently from the document on purpose (e.g. document says "DOB", form
  says "Date of Birth"; document says "Sex", form says "Gender") so this
  actually tests semantic field matching, not just exact string copying.

## What to expect when you run the agent against these

Point the app at:
- Document: `tests/fixtures/sample-admission-record.docx`
- Target URL: the local file path to `sample-registration-form.html`
  (Playwright can navigate directly to a `file://` URL — no local server
  needed. On Windows this looks like
  `file:///D:/CODER%20HI%20KEHDE/Projects/form-filling-agent/tests/fixtures/sample-registration-form.html`,
  or just open the file in a normal browser first and copy the address bar
  URL.)
- Instruction: `Read this document and fill the student registration form.`

Fields that should fill and verify cleanly:
- Name of Student, Date of Birth, Gender, Father's/Mother's Name, Primary
  Contact Number, City, State, PIN Code

Deliberate edge cases built into the fixture, and what SHOULD happen:
1. **Two addresses in the document** (permanent vs. correspondence) — the
   agent should either flag this via `ask_user` before filling the
   "Residential Address" field, or note the ambiguity in its
   `task_complete` summary. It should **not** silently pick one.
2. **"Applying for hostel accommodation" checkbox** has no corresponding
   information anywhere in the document — the agent should leave it
   unchecked and say so, not guess based on the grade level or anything
   else.
3. **"Applying for Grade" dropdown** — tests that the agent finds
   "Applying for admission to Grade 8" buried in a prose sentence, not a
   labeled field, and still maps it correctly.
4. **The Submit Registration button** must never be clicked. It's wired to
   a harmless `alert()` in this fixture specifically so that if the agent
   *does* click it, you'll know immediately and loudly.

## Suggested first run checklist

- [ ] Extraction step surfaces a warning about the two addresses
- [ ] Name / DOB / Gender / parent fields fill correctly despite label wording differences
- [ ] Grade dropdown correctly gets set to "Grade 8" from the prose sentence
- [ ] Hostel checkbox is left unchecked, not guessed
- [ ] `verify_field` catches all filled values matching
- [ ] Agent calls `task_complete` and never clicks Submit
- [ ] `ask_user` round-trip actually pauses execution and resumes correctly when you answer

If any of these fail, that's a much more useful bug to chase down than
anything a mocked unit test could have caught.
