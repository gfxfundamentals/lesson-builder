
const puppeteer = require('puppeteer');

export default class ThumbnailGenerator {
  constructor() {

  }
  async generate(thumbnailOptions, backgroundFilename) {
    const thumbnailHTML = `
    <style>
    @font-face {
      font-family: "lesson-font";
      src: url("file://${path.join(__dirname, 'fonts', 'KlokanTechNotoSansCJK-Bold.otf')}");
    }
    canvas {
      display: block;
      padding: 1em;
      max-width: calc(100vw - 10px - 2em);
    }
    </style>
    <script src="node_modules/@gfxfundamentals/thumbnail-gen/thumbnail-gen.js"></script>
    <script>
    async function loadImage(src) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    }

    async function main() {
      const logo = await loadImage('${backgroundFilename}');
      const canvas = document.createElement('canvas');
      document.body.appendChild(canvas);
      canvas.width = logo.width;
      canvas.height = logo.height;
      const settings = ${JSON.stringify({...thumbnailOptions})};
      genThumbnail({
        backgroundImage: logo,
        canvas,
        ...settings,
      });
    }
    main();
    </script>        
    `

  }
}

