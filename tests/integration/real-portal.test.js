const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const { parseDocument } = require('../../src/document/extractor');
const { BrowserSession } = require('../../src/browser/browser');

test('Standalone Real Portal — form fields detection, interactive submission, and receipt generation', async () => {
  const portalPath = path.resolve(__dirname, '..', '..', 'forms', 'student-registration-portal.html');
  const portalUrl = pathToFileURL(portalPath).href;

  // 1. Verify BrowserSession can detect all fields in the portal
  const browserSession = new BrowserSession();
  await browserSession.launch(portalUrl);

  const fields = await browserSession.readForm();
  assert.ok(fields.length >= 10, 'Expected at least 10 interactive fields');

  const nameField = fields.find((f) => f.label.toLowerCase().includes('name of student'));
  const dobField = fields.find((f) => f.label.toLowerCase().includes('date of birth'));
  const gradeField = fields.find((f) => f.label.toLowerCase().includes('grade'));
  const submitBtn = fields.find((f) => f.type === 'submit' || f.label.toLowerCase().includes('submit'));

  assert.ok(nameField, 'Student name field should be detected');
  assert.ok(dobField, 'DOB field should be detected');
  assert.ok(gradeField, 'Grade field should be detected');
  assert.ok(submitBtn, 'Submit button should be detected');

  await browserSession.close();

  // 2. Test interactive submission & receipt generation in headless browser
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(portalUrl);

  await page.locator('#full-name').fill('Aditi Rakesh Sharma');
  await page.locator('#birth-date').fill('2015-03-12');
  await page.locator('#gender').selectOption('female');
  await page.locator('#grade').selectOption('8');
  await page.locator('#father-name').fill('Rakesh Kumar Sharma');
  await page.locator('#mother-name').fill('Sunita Sharma');
  await page.locator('#contact').fill('9876543210');
  await page.locator('#street').fill('14 Lotus Lane');
  await page.locator('#city').fill('Nagpur');
  await page.locator('#state').fill('Maharashtra');
  await page.locator('#pincode').fill('440001');

  // Submit without confirmation should fail validation
  await page.locator('#submit-btn').click();
  const alertVisible = await page.locator('#alert-box').isVisible();
  assert.ok(alertVisible, 'Validation warning must be visible when confirmation checkbox is unchecked');

  // Check confirmation and submit
  await page.locator('#confirm').check();
  await page.locator('#submit-btn').click();
  await page.waitForTimeout(400);

  // Verify receipt view is shown
  const receiptVisible = await page.locator('#receipt-view').isVisible();
  assert.ok(receiptVisible, 'Receipt view should be displayed after successful submission');

  const refNo = await page.locator('#receipt-ref-no').textContent();
  assert.match(refNo, /^GRN-\d{4}-\d{5}$/, 'Reference number format should be GRN-YYYY-XXXXX');

  const studentNameOnReceipt = await page.locator('#r-name').textContent();
  assert.equal(studentNameOnReceipt, 'Aditi Rakesh Sharma');

  // Verify localStorage persistence
  const savedRecords = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem('greenwood-applications') || '[]');
  });
  assert.equal(savedRecords.length, 1);
  assert.equal(savedRecords[0].fullName, 'Aditi Rakesh Sharma');
  assert.equal(savedRecords[0].referenceNumber, refNo);

    await browser.close();
});
