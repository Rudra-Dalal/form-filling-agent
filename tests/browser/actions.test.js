const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { inspectPage } = require('../../src/browser/page-inspector');
const {
  fillText,
  clearField,
  selectOption,
  setCheckbox,
  clickElement,
} = require('../../src/browser/actions');
const { verifyField, normalizeDateForComparison } = require('../../src/browser/verifier');
const { SafetyViolationError } = require('../../src/shared/errors');

test('Browser Actions & Submission Safety', async (t) => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Load a test HTML fixture into the page
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body>
        <form id="test-form">
          <label for="name">Full Name</label>
          <input type="text" id="name" name="name" />

          <label for="dob">Date of Birth</label>
          <input type="date" id="dob" name="dob" />

          <label for="grade">Grade</label>
          <select id="grade" name="grade">
            <option value="">-- Choose --</option>
            <option value="6">Grade 6</option>
            <option value="7">Grade 7</option>
            <option value="8">Grade 8</option>
          </select>

          <label for="hostel">Hostel Required</label>
          <input type="checkbox" id="hostel" name="hostel" />

          <button type="submit" id="submit-btn">Submit Application</button>
          <button type="button" id="safe-btn">Next Step</button>
        </form>
      </body>
    </html>
  `);

  await t.test('inspectPage finds interactive elements with rich attributes', async () => {
    const elements = await inspectPage(page);
    assert.ok(elements.length >= 5);

    const nameField = elements.find((el) => el.id === 'name');
    assert.ok(nameField);
    assert.equal(nameField.label, 'Full Name');
    assert.equal(nameField.tag, 'input');
  });

  await t.test('fillText and verifyField fill and verify a text field', async () => {
    const elements = await inspectPage(page);
    const nameIndex = elements.find((el) => el.id === 'name').index;

    await fillText(page, nameIndex, 'Aditi Sharma');
    const verifyResult = await verifyField(page, nameIndex, 'Aditi Sharma');

    assert.equal(verifyResult.matches, true);
    assert.equal(verifyResult.actual, 'Aditi Sharma');
  });

  await t.test('clearField empties an input', async () => {
    const elements = await inspectPage(page);
    const nameIndex = elements.find((el) => el.id === 'name').index;

    await clearField(page, nameIndex);
    const verifyResult = await verifyField(page, nameIndex, '');

    assert.equal(verifyResult.matches, true);
    assert.equal(verifyResult.actual, '');
  });

  await t.test('selectOption chooses option by label text or value', async () => {
    const elements = await inspectPage(page);
    const gradeIndex = elements.find((el) => el.id === 'grade').index;

    await selectOption(page, gradeIndex, 'Grade 8');
    const verifyResult = await verifyField(page, gradeIndex, 'Grade 8');

    assert.equal(verifyResult.matches, true);
    assert.ok(verifyResult.actual.includes('8'));
  });

  await t.test('setCheckbox checks and unchecks a box', async () => {
    const elements = await inspectPage(page);
    const hostelIndex = elements.find((el) => el.id === 'hostel').index;

    await setCheckbox(page, hostelIndex, true);
    let verifyResult = await verifyField(page, hostelIndex, true);
    assert.equal(verifyResult.matches, true);
    assert.equal(verifyResult.actual, 'true');

    await setCheckbox(page, hostelIndex, false);
    verifyResult = await verifyField(page, hostelIndex, false);
    assert.equal(verifyResult.matches, true);
    assert.equal(verifyResult.actual, 'false');
  });

  await t.test('verifyField normalizes date representations', async () => {
    const elements = await inspectPage(page);
    const dobIndex = elements.find((el) => el.id === 'dob').index;

    // Type ISO date into date input
    await fillText(page, dobIndex, '2015-03-12');

    // Should match both ISO YYYY-MM-DD and DD/MM/YYYY
    const isoResult = await verifyField(page, dobIndex, '2015-03-12');
    assert.equal(isoResult.matches, true);

    const dmyResult = await verifyField(page, dobIndex, '12/03/2015');
    assert.equal(dmyResult.matches, true);
  });

  await t.test('clickElement on safe button succeeds', async () => {
    const elements = await inspectPage(page);
    const safeIndex = elements.find((el) => el.id === 'safe-btn').index;

    await clickElement(page, safeIndex);
  });

  await t.test('CRITICAL: clickElement on submit button throws SafetyViolationError', async () => {
    const elements = await inspectPage(page);
    const submitIndex = elements.find((el) => el.id === 'submit-btn').index;

    await assert.rejects(
      async () => {
        await clickElement(page, submitIndex);
      },
      (err) => {
        assert.ok(err instanceof SafetyViolationError);
        assert.ok(err.message.includes('submission is strictly prohibited'));
        return true;
      }
    );
  });

  await browser.close();
});
