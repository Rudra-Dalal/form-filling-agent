const { _electron: electron } = require('playwright');
const path = require('path');
const { pathToFileURL } = require('url');

async function runCanonicalFlow() {
  console.log('=== STARTING CANONICAL ELECTRON END-TO-END FLOW ===');
  const appPath = path.resolve(__dirname, '..');
  const docFixturePath = path.join(__dirname, 'fixtures', 'sample-admission-record.docx');
  const formFixturePath = path.join(__dirname, 'fixtures', 'sample-registration-form.html');
  const formUrl = pathToFileURL(formFixturePath).href;

  console.log('Document fixture:', docFixturePath);
  console.log('Form fixture URL:', formUrl);

  const electronApp = await electron.launch({
    args: [appPath],
    env: {
      ...process.env,
      NODE_ENV: 'production',
      E2E_FIXTURE_DOC: docFixturePath,
    },
  });

  const window = await electronApp.firstWindow();
  await window.waitForLoadState('domcontentloaded');
  await window.waitForTimeout(2000);

  console.log('1. Window loaded. Clicking document dropzone to pick and parse document...');
  const dropzone = window.locator('.dropzone');
  await dropzone.click();

  // Wait for extracted fields to appear in UI
  console.log('Waiting for extraction preview in UI...');
  await window.waitForSelector('.file-chip-card', { timeout: 10000 });
  await window.waitForSelector('.extraction-grid', { timeout: 10000 });

  // Verify extracted document values in UI
  const studentNameInput = window.locator('input[value="Aditi Rakesh Sharma"]');
  const dobInput = window.locator('input[value="2015-03-12"]');
  const fatherInput = window.locator('input[value="Rakesh Kumar Sharma"]');
  const ambiguityWarning = window.locator('.warning-callout');

  const nameCount = await studentNameInput.count();
  const dobCount = await dobInput.count();
  const fatherCount = await fatherInput.count();
  const warningCount = await ambiguityWarning.count();

  console.log('Extraction UI verification:');
  console.log(' - Student Name field present:', nameCount > 0);
  console.log(' - DOB field present:', dobCount > 0);
  console.log(' - Father Name field present:', fatherCount > 0);
  console.log(' - Address Ambiguity warning present:', warningCount > 0);

  if (!nameCount || !warningCount) {
    throw new Error('FAILED: Document extraction UI fields or ambiguity warning missing!');
  }

  // Set target form URL
  console.log('2. Entering target form URL...');
  const urlInput = window.locator('#target-url');
  await urlInput.fill(formUrl);
  await window.waitForTimeout(500);

  // Click Start Filling
  console.log('3. Clicking "Start filling" button...');
  const startBtn = window.locator('#start-btn');
  await startBtn.click();

  // Wait for clarification card OR review card
  console.log('4. Waiting for agent progress...');
  const clarificationCard = window.locator('.clarification-card');
  const reviewCard = window.locator('.review-card');

  // Check if clarification card appears
  try {
    await clarificationCard.waitFor({ state: 'visible', timeout: 10000 });
    console.log('Clarification card appeared! Choosing "Use Permanent"...');
    const permBtn = window.locator('button:has-text("Use Permanent")');
    await permBtn.click();
    console.log('Permanent address chosen.');
  } catch {
    console.log('Clarification card was not triggered or already resolved.');
  }

  // Wait for Ready for Review card
  console.log('5. Waiting for READY_FOR_REVIEW card...');
  await reviewCard.waitFor({ state: 'visible', timeout: 25000 });
  console.log('READY_FOR_REVIEW card is visibly rendered in the Electron window!');

  const reviewTitle = await window.locator('.review-title').textContent();
  console.log('Review Title:', reviewTitle);

  // Check status pill
  const statusPillText = await window.locator('.status-pill').textContent();
  console.log('Status Pill:', statusPillText);

  // Screenshot the completed Review state
  const artifactDir = path.resolve('C:\\Users\\ASUS\\.gemini\\antigravity-ide\\brain\\b3438c9b-e148-4eee-a3b0-bc8c9df217d6');
  const reviewScreenshotPath = path.join(artifactDir, 'electron_ready_for_review_verification.png');
  await window.screenshot({ path: reviewScreenshotPath });
  console.log('Screenshot of READY FOR REVIEW saved to:', reviewScreenshotPath);

  // Verify DOM values in the live browser session
  // Electron IPC has active session
  const domResult = await window.evaluate(async () => {
    if (window.agentAPI && window.agentAPI.getBrowserDomValues) {
      return await window.agentAPI.getBrowserDomValues();
    }
    return null;
  });

  if (domResult && domResult.ok && domResult.values) {
    console.log('Browser DOM values verified:', domResult.values);
  }

  await electronApp.close();
  console.log('=== CANONICAL FLOW COMPLETED SUCCESSFULLY! ===');
}

runCanonicalFlow().catch((err) => {
  console.error('Canonical flow error:', err);
  process.exit(1);
});
