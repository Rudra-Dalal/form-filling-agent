const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { parseDocument } = require('../../src/document/extractor');
const { AgentSession } = require('../../src/agent/agent');
const { AGENT_STATES } = require('../../src/shared/constants');
const { AGENT_EVENTS } = require('../../src/shared/events');

test('Integration — End-to-End Fixture Dry Run (sample-admission-record.docx -> sample-registration-form.html)', async () => {
  const docFixturePath = path.join(__dirname, '..', 'fixtures', 'sample-admission-record.docx');
  const formFixturePath = path.join(__dirname, '..', 'fixtures', 'sample-registration-form.html');
  const targetUrl = pathToFileURL(formFixturePath).href;

  // Step 1: Parse and structure document
  const parsedDoc = await parseDocument(docFixturePath, { dryRun: true });

  assert.equal(parsedDoc.student.fullName, 'Aditi Rakesh Sharma');
  assert.equal(parsedDoc.student.dateOfBirth, '2015-03-12');
  assert.equal(parsedDoc.student.gender, 'Female');
  assert.equal(parsedDoc.parent.fatherName, 'Rakesh Kumar Sharma');
  assert.equal(parsedDoc.parent.motherName, 'Sunita Sharma');
  assert.equal(parsedDoc.parent.contactNumber, '9876543210');
  assert.equal(parsedDoc.address.city, 'Nagpur');
  assert.equal(parsedDoc.address.state, 'Maharashtra');
  assert.equal(parsedDoc.address.pincode, '440001');

  // Verify warnings generated for address ambiguity
  assert.ok(parsedDoc.warnings.length > 0);

  // Step 2: Initialize AgentSession for fixture dry-run
  const events = [];
  const session = new AgentSession({
    documentData: parsedDoc,
    targetUrl,
    instruction: 'Read this document and fill the student registration form.',
    dryRun: true,
    onEvent: (evt) => events.push(evt),
  });

  // Ensure browser runs headless for automated test environment
  // We can launch with headless context for automated testing
  const originalLaunch = session.browserSession.launch.bind(session.browserSession);
  session.browserSession.launch = async (url) => {
    const { chromium } = require('playwright');
    session.browserSession.browser = await chromium.launch({ headless: true });
    session.browserSession.context = await session.browserSession.browser.newContext();
    session.browserSession.page = await session.browserSession.context.newPage();
    if (url) {
      await session.browserSession.page.goto(url, { waitUntil: 'domcontentloaded' });
    }
  };

  // Run the session
  const runPromise = session.run();

  // Handle address clarification if ask_user event fires
  const pollStart = Date.now();
  while (!events.some((e) => e.type === AGENT_EVENTS.ASK_USER || e.type === AGENT_EVENTS.COMPLETED) && Date.now() - pollStart < 5000) {
    await new Promise((r) => setTimeout(r, 20));
  }

  const askUserEvt = events.find((e) => e.type === AGENT_EVENTS.ASK_USER);
  if (askUserEvt) {
    assert.ok(askUserEvt.question.includes('address') || askUserEvt.question.includes('Address'));
    // User answers with permanent address
    session.provideUserAnswer(askUserEvt.promptId, '14 Lotus Lane');
  }

  await runPromise;

  // Verify terminal state
  assert.equal(session.state, AGENT_STATES.COMPLETED);

  // Verify completion event
  const completeEvent = events.find((e) => e.type === AGENT_EVENTS.COMPLETED);
  assert.ok(completeEvent, 'Session must emit completion event');
  assert.ok(completeEvent.summary.toLowerCase().includes('verified'));

  // Verify DOM values in actual browser
  const page = session.browserSession.getPage();
  assert.ok(page, 'Page should still be accessible for review');

  const fullNameVal = await page.inputValue('#full-name');
  assert.equal(fullNameVal, 'Aditi Rakesh Sharma');

  const dobVal = await page.inputValue('#birth-date');
  assert.equal(dobVal, '2015-03-12');

  const genderVal = await page.inputValue('#gender');
  assert.equal(genderVal, 'female');

  const gradeVal = await page.inputValue('#grade');
  assert.equal(gradeVal, '8');

  const fatherVal = await page.inputValue('#father-name');
  assert.equal(fatherVal, 'Rakesh Kumar Sharma');

  const motherVal = await page.inputValue('#mother-name');
  assert.equal(motherVal, 'Sunita Sharma');

  const contactVal = await page.inputValue('#contact');
  assert.equal(contactVal, '9876543210');

  const cityVal = await page.inputValue('#city');
  assert.equal(cityVal, 'Nagpur');

  const stateVal = await page.inputValue('#state');
  assert.equal(stateVal, 'Maharashtra');

  const pincodeVal = await page.inputValue('#pincode');
  assert.equal(pincodeVal, '440001');

  // Verify hostel accommodation checkbox was left UNCHECKED (never guessed)
  const hostelChecked = await page.isChecked('#hosteler');
  assert.equal(hostelChecked, false, 'Hostel checkbox must remain unchecked when not in document');

  // Verify submit button was NEVER clicked
  // In sample-registration-form.html, submit triggers an alert(). If clicked, a dialog would have been raised.
  const toolCalls = events.filter((e) => e.type === AGENT_EVENTS.TOOL_CALL);
  const clickCalls = toolCalls.filter((c) => c.name === 'click');
  assert.equal(clickCalls.length, 0, 'Agent must not click submit buttons');

  // Verify verifications recorded
  assert.ok(session.verifier.allVerified());
  assert.ok(session.verifier.getLog().length >= 8);

  await session.close();
});
