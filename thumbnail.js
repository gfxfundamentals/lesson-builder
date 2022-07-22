'use strict';
const fs = require('fs');
const path = require('path');
const Server = require('./server');
const puppeteer = require('puppeteer');
const mime = require('mime-types');
const { createExposedPromise } = require('./lib/utils');

const logger = {
  log: console.log.bind(console),
  error: console.error.bind(console),
  c: new Proxy({}, {
    get(/*target, name*/) {
      return s => s;
    },
  }),
};

class ServerWrapper {
  constructor() {
  }
  async init() {
    if (!this.initPromise) {
      this.initPromise = new Promise((resolve, reject) => {
        this.server = new Server({
          local: true,
          port: 8080,
          scan: true,
          root: __dirname,
          logger: process.env.DEBUG ? logger : undefined,
        });
        this.server.addListener('error', reject);
        this.server.addListener('start', resolve);
      });
      const {/*port, protocol,*/ baseUrl} = await this.initPromise;
      this.baseUrl = baseUrl;
    }
    await this.initPromise;
  }
  async getBaseUrl() {
    await this.init();
    return this.baseUrl;
  }
  async addFile(pathname, mimeType, content) {
    await this.init();
    this.server.addFile(pathname, mimeType, content);
  }
  async deleteFile(pathname) {
    await this.init();
    this.server.deleteFile(pathname);
  }
  async deleteFiles() {
    // TDB
  }
  async close() {
    if (this.initPromise) {
      delete this.initPromise;
      const {server} = this;
      this.server = undefined;
      const p = new Promise((resolve) => {
        server.addListener('close', resolve);
      });
      server.close();
      await p;
    }
  }
}

function readFileAsBuffer(filename) {
  return fs.readFileSync(filename);
}

// const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

class ThumbnailGenerator {
  constructor() {
    this.id = 0;
  }
  async launch(settings) {
    if (this.initPromise) {
      return this.initPromise.promise;
    }
    this.initPromise = createExposedPromise();
    this.browser = await puppeteer.launch({dumpio: !!process.env.DEBUG});
    this.page = await this.browser.newPage();

    /*
     this.page.on('console', message =>
        console.log(`===========> ${message.type().substr(0, 3).toUpperCase()} ${message.text()}`));
     this.page.on('pageerror', ({ message }) => console.log('=-=-=-=-=>', message));
    */

    this.server = new ServerWrapper();
    await this.server.init();

    const {server, page} = this;
    const promises = [
      server.getBaseUrl(),
    ];
    const js = readFileAsBuffer(require.resolve('@gfxfundamentals/thumbnail-gen'));
    promises.push(server.addFile('thumbnail-gen.js', 'application/javascript', js));

    const userFonts = settings.fonts || [];
    const fonts = [
      // default font
      { name: 'lesson-font', filename: path.join(__dirname, 'fonts', 'KlokanTechNotoSansCJK-Bold.otf'), },
      ...userFonts,
    ];
    const fontsHTML = fonts.map(({name, filename}, ndx) => {
      const font = readFileAsBuffer(filename);
      const refName = `fonts/font-${ndx}${path.extname(filename)}`;
      promises.push(server.addFile(refName, mime.lookup(filename), font));
      // we need to put usage of each font otherwise
      return `
      <style>
        @font-face {
          font-family: "${name}";
          src: url("${refName}");
        }
      </style>
      <div style="font-family: ${name};">test</div>
      `;
    });

    const id = '00000';
    const img = readFileAsBuffer(settings.backgroundFilename);
    const ext = path.extname(settings.backgroundFilename);
    const imgFilename = `img-${id}${ext}`;
    const imgMimeType = mime.lookup(settings.backgroundFilename);
    promises.push(server.addFile(imgFilename, imgMimeType, img));
    const html = `
<body>
${fontsHTML.join('\n')}
</body>
<script src="thumbnail-gen.js"></script>
<script>
'use strict';

const imgs = new Map();
async function loadImage(src) {
  return new Promise((resolve, reject) => {
    let img = imgs.get(src);
    if (img) {
      resolve(img);
      return;
    }

    img = new Image();
    imgs.set(src, img);
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function createExposedPromise() {
  let resolve;
  let reject;
  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  return {
    promise,
    resolve,
    reject,
  };
}

const canvas = document.createElement('canvas');
document.body.appendChild(canvas);

async function main(settings) {
  try {
    await document.fonts.ready;
    const logo = await loadImage(settings.imgFilename);
    canvas.width = logo.width;
    canvas.height = logo.height;
    settings.backgroundImage = logo;
    settings.canvas = canvas;
    genThumbnail(settings);
    return canvas;
 } catch(e) {
   console.error(e);
   throw e;
  }
}

</script>
    `;
    const htmlFilename = `page-${id}.html`;
    promises.push(server.addFile(htmlFilename, 'text/html', html));
    const results = await Promise.all(promises);
    const baseUrl = results[0];
    const htmlHref = `${baseUrl}/${htmlFilename}`;

    await page.goto(htmlHref, {
      waitUntil: 'networkidle2',
    });

// these should be put in a cache
this.imgHref = `${baseUrl}/${imgFilename}`;
    this.initPromise.resolve();
    return this.initPromise.promise;
  }
  async generate(_settings) {
    await this.launch(_settings);
    const settings = {
      ..._settings,
      imgFilename: this.imgHref,
    };
    const {page} = this;

    const data = await page.evaluate(async(settings) => {
      const canvas = await main(settings);
      return {
        dataURL: canvas.toDataURL('image/jpeg', 0.9),
      };
    }, settings);

    const header = 'data:image/jpeg;base64,';
    const bytes = Buffer.from(data.dataURL.substring(header.length), 'base64');

    return bytes;
  }
  async close() {
    if (this.browser) {
      const {browser, server} = this;
      delete this.browser;
      delete this.page;
      delete this.server;
      await Promise.all([
        server.deleteFiles,
      ]);
      await browser.close();
      await server.close();
    }
  }
}

module.exports = ThumbnailGenerator;
