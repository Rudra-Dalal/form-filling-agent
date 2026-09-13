const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testLaunchElectron() {
  console.log('--- LAUNCHING ELECTRON APP FOR UI & DARK MODE VERIFICATION ---');
  const appPath = path.resolve(__dirname, '..');

  const electronApp = await electron.launch({
    args: [appPath],
    env: { ...process.env, NODE_ENV: 'production' }
  });

  const window = await electronApp.firstWindow();
  await window.waitForLoadState('domcontentloaded');
  await window.waitForTimeout(2000); // Allow react rendering

  const title = await window.title();
  console.log('Window Title:', title);

  const appTitle = await window.locator('.app-title').textContent();
  console.log('Header App Title:', appTitle);

  const appSubtitle = await window.locator('.app-subtitle').textContent();
  console.log('Header App Subtitle:', appSubtitle);

  // Check that old legacy elements and macOS dots are NOT present
  const oldText1 = await window.locator('text=Document → Form AI Agent').count();
  const oldText2 = await window.locator('text=1. TASK CONFIGURATION').count();
  const oldText3 = await window.locator('text=Deterministic Dry Run').count();
  const windowDots = await window.locator('.window-dots').count();
  const dotElements = await window.locator('.window-dot').count();

  console.log('Checks for removed elements:');
  console.log(' - "Document → Form AI Agent":', oldText1);
  console.log(' - "1. TASK CONFIGURATION":', oldText2);
  console.log(' - "Deterministic Dry Run":', oldText3);
  console.log(' - Window dots container (.window-dots):', windowDots);
  console.log(' - Individual window dots (.window-dot):', dotElements);

  if (oldText1 > 0 || oldText2 > 0 || oldText3 > 0) {
    throw new Error('FAILED: Old legacy UI elements are still present in the rendered Electron window!');
  }
  if (windowDots > 0 || dotElements > 0) {
    throw new Error('FAILED: Window dots were not removed!');
  }

  // Check that new Stitch elements are present
  const docCardTitle = await window.locator('.card-title', { hasText: 'Student Document' }).count();
  const targetFormTitle = await window.locator('.card-title', { hasText: 'Where should I fill this?' }).count();
  const progressStepper = await window.locator('.progress-stepper').count();
  const startBtn = await window.locator('#start-btn').count();
  const themeToggle = await window.locator('#theme-toggle-btn').count();

  console.log('New Stitch elements count in DOM:');
  console.log(' - Student Document Card:', docCardTitle);
  console.log(' - "Where should I fill this?" Card:', targetFormTitle);
  console.log(' - Progress Stepper:', progressStepper);
  console.log(' - Start Filling Button:', startBtn);
  console.log(' - Dark/Light Theme Toggle Button:', themeToggle);

  if (!docCardTitle || !targetFormTitle || !progressStepper || !startBtn || !themeToggle) {
    throw new Error('FAILED: Expected new Stitch UI elements or Theme Toggle are missing!');
  }

  const artifactDir = path.resolve('C:\\Users\\ASUS\\.gemini\\antigravity-ide\\brain\\b3438c9b-e148-4eee-a3b0-bc8c9df217d6');

  // Screenshot in Light Mode
  const lightScreenshotPath = path.join(artifactDir, 'running_electron_ui_light_mode.png');
  await window.screenshot({ path: lightScreenshotPath });
  console.log('Screenshot of LIGHT MODE saved to:', lightScreenshotPath);

  // Toggle to Dark Mode
  console.log('Testing Dark Mode Toggle...');
  const themeBtn = window.locator('#theme-toggle-btn');
  await themeBtn.click();
  await window.waitForTimeout(500);

  const darkThemeAttr = await window.evaluate(() => document.documentElement.getAttribute('data-theme'));
  console.log('Document data-theme after toggle:', darkThemeAttr);
  if (darkThemeAttr !== 'dark') {
    throw new Error('FAILED: Dark mode was not applied to document data-theme attribute!');
  }

  // Screenshot in Dark Mode
  const darkScreenshotPath = path.join(artifactDir, 'running_electron_ui_dark_mode.png');
  await window.screenshot({ path: darkScreenshotPath });
  console.log('Screenshot of DARK MODE saved to:', darkScreenshotPath);

  // Toggle back to Light Mode to verify roundtrip
  await themeBtn.click();
  await window.waitForTimeout(500);
  const backToLightAttr = await window.evaluate(() => document.documentElement.getAttribute('data-theme'));
  console.log('Document data-theme after toggle back:', backToLightAttr);
  if (backToLightAttr !== 'light') {
    throw new Error('FAILED: Light mode was not restored after second toggle!');
  }

  await electronApp.close();
  console.log('VERIFICATION COMPLETE: Window dots removed, Dark Mode implemented and verified successfully!');
}

testLaunchElectron().catch((err) => {
  console.error('Error during Electron test launch:', err);
  process.exit(1);
});
