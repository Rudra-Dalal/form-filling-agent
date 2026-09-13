const { chromium } = require('playwright');
const { inspectPage } = require('./page-inspector');
const { fillText, clearField, selectOption, setCheckbox, clickElement } = require('./actions');
const { verifyField } = require('./verifier');
const { BrowserActionError } = require('../shared/errors');
const { HEADLESS, DEFAULT_NAV_TIMEOUT_MS } = require('../shared/constants');

class BrowserSession {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  /**
   * Launches a visible Chromium browser instance and navigates to the target URL.
   * @param {string} targetUrl
   */
  async launch(targetUrl) {
    try {
      this.browser = await chromium.launch({
        headless: HEADLESS,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--window-size=1050,680',
          '--window-position=50,20',
        ],
      });
      this.context = await this.browser.newContext({
        viewport: { width: 1050, height: 580 },
      });
      this.page = await this.context.newPage();
      this.page.setDefaultNavigationTimeout(DEFAULT_NAV_TIMEOUT_MS);

      this.page.on('dialog', async (dialog) => {
        const msg = dialog.message();
        await dialog.accept();
        try {
          await this.page.evaluate((text) => {
            const existing = document.getElementById('__agent-alert-toast');
            if (existing) existing.remove();

            const toast = document.createElement('div');
            toast.id = '__agent-alert-toast';
            toast.style.position = 'fixed';
            toast.style.top = '24px';
            toast.style.left = '50%';
            toast.style.transform = 'translateX(-50%)';
            toast.style.backgroundColor = '#065f46';
            toast.style.color = '#ffffff';
            toast.style.padding = '14px 28px';
            toast.style.borderRadius = '8px';
            toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)';
            toast.style.zIndex = '9999999';
            toast.style.fontFamily = 'Arial, sans-serif';
            toast.style.fontSize = '15px';
            toast.style.fontWeight = '600';
            toast.style.display = 'flex';
            toast.style.alignItems = 'center';
            toast.style.gap = '10px';
            toast.style.border = '2px solid #34d399';
            toast.innerHTML = '<span>🔔 Form Submission Alert: ' + text + '</span>';
            document.body.appendChild(toast);

            setTimeout(() => {
              if (toast && toast.parentNode) toast.remove();
            }, 6000);
          }, msg);
        } catch (_) {}
      });

      if (targetUrl) {
        await this.page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
      }
    } catch (err) {
      throw new BrowserActionError(`Failed to launch browser: ${err.message}`);
    }
  }

  /**
   * Returns the active Playwright page instance.
   * @returns {import('playwright').Page|null}
   */
  getPage() {
    return this.page;
  }

  /**
   * Reads current form elements and assigns numbered markers.
   * @returns {Promise<import('../shared/types').DetectedFormField[]>}
   */
  async readForm() {
    this._ensurePage();
    return inspectPage(this.page);
  }

  /**
   * Types value into the element at elementIndex.
   * @param {number} elementIndex
   * @param {string} value
   */
  async fillText(elementIndex, value) {
    this._ensurePage();
    return fillText(this.page, elementIndex, value);
  }

  /**
   * Clears value in the element at elementIndex.
   * @param {number} elementIndex
   */
  async clearField(elementIndex) {
    this._ensurePage();
    return clearField(this.page, elementIndex);
  }

  /**
   * Selects dropdown option by label.
   * @param {number} elementIndex
   * @param {string} optionLabel
   */
  async selectOption(elementIndex, optionLabel) {
    this._ensurePage();
    return selectOption(this.page, elementIndex, optionLabel);
  }

  /**
   * Checks or unchecks a checkbox or radio.
   * @param {number} elementIndex
   * @param {boolean} shouldBeChecked
   */
  async setCheckbox(elementIndex, shouldBeChecked) {
    this._ensurePage();
    return setCheckbox(this.page, elementIndex, shouldBeChecked);
  }

  /**
   * Clicks an interactive element.
   * @param {number} elementIndex
   */
  async click(elementIndex) {
    this._ensurePage();
    return clickElement(this.page, elementIndex);
  }

  /**
   * Verifies that the field value on the page matches the expected value.
   * @param {number} elementIndex
   * @param {string|boolean} expectedValue
   */
  async verifyField(elementIndex, expectedValue) {
    this._ensurePage();
    return verifyField(this.page, elementIndex, expectedValue);
  }

  /**
   * Captures a screenshot buffer of the active page.
   * @returns {Promise<Buffer>}
   */
  async screenshot() {
    this._ensurePage();
    return this.page.screenshot({ type: 'png' });
  }

  /**
   * Closes browser resources cleanly.
   */
  async close() {
    try {
      if (this.browser) {
        await this.browser.close();
      }
    } finally {
      this.browser = null;
      this.context = null;
      this.page = null;
    }
  }

  _ensurePage() {
    if (!this.page) {
      throw new BrowserActionError('Browser page is not open. Launch the browser first.');
    }
  }
}

module.exports = { BrowserSession };
