const path = require('path');
const puppeteer = require('puppeteer');

class ThumbnailGenerator {
  constructor() {
  }
  async launch() {
    if (!this.browser) {
      this.browser = await puppeteer.launch();
      this.page = await this.browser.newPage();

      await this.page.goto(`file://${path.join(__dirname, 'html', 'thumbnail.html')}`, {
        waitUntil: 'networkidle2',
      });
    }
  }
  async generate(settings) {
    await this.launch();

    const result = await this.page.evaluate((settings) => {
      return generate(settings);
    }, settings);

    return result;
  }
  async close() {
    if (this.browser) {
      await this.browser.close();
      delete this.browser;
    }
  }
}

module.exports = ThumbnailGenerator;