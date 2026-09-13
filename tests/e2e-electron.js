const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testLaunchElectron() {
  console.log('--- LAUNCHING ELECTRON APP FOR UI VERIFICATION ---');
  const appPath = path.resolve(__dirname, '..');

  const electronApp = await electron.launch({
    args: [appPath],
    env: { ...process.env, NODE_ENV: 'production' }
  });

  const window = await electronApp.firstWindow();
  await window.waitForLoadState('domcontentloaded');
  await window.waitForTimeout(2500); // Allow react rendering

  const title = await window.title();
  console.log('Window Title:', title);

  const appTitle = await window.locator('.app-title').textContent();
  console.log('Header App Title:', appTitle);

  const appSubtitle = await window.locator('.app-subtitle').textContent();
  console.log('Header App Subtitle:', appSubtitle);

  // Check that old legacy elements are NOT present
  const oldText1 = await window.locator('text=Document → Form AI Agent').count();
  const oldText2 = await window.locator('text=1. TASK CONFIGURATION').count();
  const oldText3 = await window.locator('text=Deterministic Dry Run').count();

  console.log('Old legacy elements count in DOM:');
  console.log(' - "Document → Form AI Agent":', oldText1);
  console.log(' - "1. TASK CONFIGURATION":', oldText2);
  console.log(' - "Deterministic Dry Run":', oldText3);

  if (oldText1 > 0 || oldText2 > 0 || oldText3 > 0) {
    throw new Error('FAILED: Old legacy UI elements are still present in the rendered Electron window!');
  }

  // Check that new Stitch elements are present
  const docCardTitle = await window.locator('.card-title', { hasText: 'Student Document' }).count();
  const targetFormTitle = await window.locator('.card-title', { hasText: 'Where should I fill this?' }).count();
  const progressStepper = await window.locator('.progress-stepper').count();
  const startBtn = await window.locator('#start-btn').count();

  console.log('New Stitch elements count in DOM:');
  console.log(' - Student Document Card:', docCardTitle);
  console.log(' - "Where should I fill this?" Card:', targetFormTitle);
  console.log(' - Progress Stepper:', progressStepper);
  console.log(' - Start Filling Button:', startBtn);

  if (!docCardTitle || !targetFormTitle || !progressStepper || !startBtn) {
    throw new Error('FAILED: Expected new Stitch UI elements are missing!');
  }

  // Screenshot the window
  const artifactDir = path.resolve('C:\\Users\\ASUS\\.gemini\\antigravity-ide\\brain\\b3438c9b-e148-4eee-a3b0-bc8c9df217d6');
  const screenshotPath = path.join(artifactDir, 'running_electron_ui_verification.png');
  await window.screenshot({ path: screenshotPath });
  console.log('Screenshot of RUNNING Electron UI successfully saved to:', screenshotPath);

  await electronApp.close();
  console.log('VERIFICATION COMPLETE: Electron application launched and verified successfully!');
}

testLaunchElectron().catch((err) => {
  console.error('Error during Electron test launch:', err);
  process.exit(1);
});
