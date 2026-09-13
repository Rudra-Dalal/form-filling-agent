const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testVisibleChromiumViewport() {
  console.log('=== VERIFYING VISIBLE CHROMIUM VIEWPORT ACCESSIBILITY ===');
  
  const formPath = path.resolve(__dirname, 'fixtures', 'sample-registration-form.html');
  const formUrl = `file:///${formPath.replace(/\\/g, '/')}`;

  // Launch Chromium exactly as configured for the agent in headed mode
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--window-size=1100,700',
      '--window-position=50,20',
    ],
  });

  const context = await browser.newContext({ noViewport: true });
  const page = await context.newPage();
  await page.goto(formUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Measure initial viewport and inner window dimensions
  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    outerWidth: window.outerWidth,
    outerHeight: window.outerHeight,
    screenHeight: window.screen.height,
    screenAvailHeight: window.screen.availHeight,
    screenAvailTop: window.screen.availTop,
    documentHeight: document.documentElement.scrollHeight,
    initialScrollY: window.scrollY
  }));

  console.log('Browser window & screen metrics:');
  console.log(' - Outer window size:', `${metrics.outerWidth} x ${metrics.outerHeight}`);
  console.log(' - Inner viewport size:', `${metrics.innerWidth} x ${metrics.innerHeight}`);
  console.log(' - Screen height & working area:', `${metrics.screenHeight} (avail: ${metrics.screenAvailHeight})`);
  console.log(' - Document total scroll height:', metrics.documentHeight);

  // Normal scroll to the bottom of the page
  console.log('Scrolling to bottom of the form normally...');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(600);

  const scrollY = await page.evaluate(() => window.scrollY);
  console.log('ScrollY after scrolling to bottom:', scrollY);

  // Check the green submit button
  const submitBtn = page.locator('button', { hasText: 'Submit Registration' });
  const isVisible = await submitBtn.isVisible();
  const box = await submitBtn.boundingBox();
  
  console.log('Submit button bounding box:', box);
  console.log('Submit button isVisible:', isVisible);

  if (!box) {
    throw new Error('Submit button bounding box not found!');
  }

  const btnTop = box.y;
  const btnBottom = box.y + box.height;
  const clearanceBelow = metrics.innerHeight - btnBottom;

  console.log(`Button position relative to viewport: top=${btnTop}px, bottom=${btnBottom}px`);
  console.log(`Clearance below button inside viewport: ${clearanceBelow}px`);

  // Assertions
  if (btnBottom > metrics.innerHeight) {
    throw new Error(`FAILED: Button bottom (${btnBottom}px) exceeds viewport inner height (${metrics.innerHeight}px). Button is cut off!`);
  }

  if (clearanceBelow < 15) {
    throw new Error(`FAILED: Insufficient clearance below button (${clearanceBelow}px).`);
  }

  console.log('SUCCESS: Final green button is completely visible above viewport bottom without F11 or zoom!');

  // Capture screenshot of the scrolled page
  const artifactDir = 'C:\\Users\\ASUS\\.gemini\\antigravity-ide\\brain\\b3438c9b-e148-4eee-a3b0-bc8c9df217d6';
  const screenshotPath = path.join(artifactDir, 'visible_chromium_bottom_verified.png');
  await page.screenshot({ path: screenshotPath });
  console.log('Screenshot saved to:', screenshotPath);

  await browser.close();
  console.log('=== VISIBLE CHROMIUM VIEWPORT VERIFICATION PASSED ===');
}

testVisibleChromiumViewport().catch((err) => {
  console.error(err);
  process.exit(1);
});
