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
      this.browser = await chromium.launch({ headless: HEADLESS });
      this.context = await this.browser.newContext();
      this.page = await this.context.newPage();
      this.page.setDefaultNavigationTimeout(DEFAULT_NAV_TIMEOUT_MS);
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
