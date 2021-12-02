const fs = require('fs');
const path = require('path');
const CanvasKitInit = require(path.join(__dirname, 'node_modules', 'canvaskit-wasm', 'bin', 'canvaskit.js'));

// Because the Skia people apparently don't know JavaScript
// they don't follow JavaScript conventions (T_T)
/* eslint new-cap: 0 */

function hsl(h, s, l) {
  return `hsl(${h * 360 | 0},${s * 100}%,${l * 100}%)`;
}

function textAlignToCanvasKitAlign(CanvasKit, align) {
  switch (align) {
    case 'left':
      return CanvasKit.TextAlign.Left;
    case 'center':
      return CanvasKit.TextAlign.Center;
    case 'right':
      return CanvasKit.TextAlign.Right;
    default:
      throw new Error(`unknown alignemt: ${align}`);
  }
}

function genThumbnail(options) {
  const {
    backgroundImage,
    canvas,
    text,
    CanvasKit,
    fontMgr,
  } = options;

  function relativeOffset(offset) {
    return [
      offset[0] >= 0 ? offset[0] : backgroundImage.width  + offset[0],
      offset[1] >= 0 ? offset[1] : backgroundImage.height + offset[1],
    ];
  }

  function makeHueFromStr(text) {
    let s = 0;
    for (let i = 0; i < text.length; ++i) {
      s += text.codePointAt(i);
    }
    return s / 100 % 1;
  }

  const ctx = canvas.getContext('2d');
  ctx.drawImage(backgroundImage, 0, 0);

  for (const t of text) {
    const {
      text,
      font,
      verticalSpacing, // 100
      offset,  // 100, 120
      shadowOffset,  // 15
      strokeWidth,  // 15
      textWrapWidth,  // 1000
      color,
      textAlign,
    } = t;

    const drawParagraph = function drawParagraph(ctx, text, x, y, stroke) {
     const parts = ctx.font.split(/\s/);
     const fontSize = parseInt(parts[1]);
     const fontFamily = parts[2];
     const paraStyle = new CanvasKit.ParagraphStyle({
        textStyle: {
          color: ctx.fillStyle,
          fontFamilies: ['Roboto', 'Noto Color Emoji'],
          fontSize,
        },
        textAlign: textAlignToCanvasKitAlign(CanvasKit, ctx.textAlign),
        maxLines: 7,
        ellipsis: '...',
      });

      const builder = CanvasKit.ParagraphBuilder.Make(paraStyle, fontMgr);
      builder.addText(text);
      const paragraph = builder.build();
      paragraph.layout(textWrapWidth);
      ctx.Nd.drawParagraph(paragraph, x, y);

      /*
      const words = text.split(' ');
      let str = words.shift();
      do {
        const word = words.shift() || '';
        const newStr = `${str} ${word}`;
        const m = ctx.measureText(newStr);
        if (m.width > textWrapWidth || !word) {
          let cut = '';
          while (str.length) {
            const m = ctx.measureText(str);
            if (m.width <= textWrapWidth) {
              break;
            }
            cut = `${str[str.length - 1]}${cut}`;
            str = str.substr(0, str.length - 1);
          }
          if (stroke) {
            ctx.strokeText(str, x, y);
          } else {
            ctx.fillText(str, x, y);
          }
          y += verticalSpacing;
          if (cut) {
            str = cut;
            words.push(word);
          } else {
            str = word;
          }
        } else {
          str = newStr;
        }
      } while (str);
      */
    };

    const drawShadowedParagraph = function drawShadowedParagraph(ctx, text, x, y) {
      const color = ctx.fillStyle;
      ctx.strokeStyle = 'black';
      ctx.fillStyle = 'black';
      drawParagraph(ctx, text, x + shadowOffset[0], y + shadowOffset[1], true);
      drawParagraph(ctx, text, x + shadowOffset[0], y + shadowOffset[1], false);
      ctx.strokeStyle = 'white';
      ctx.lineWidth = strokeWidth;
      drawParagraph(ctx, text, x, y, true);
      ctx.fillStyle = color;
      drawParagraph(ctx, text, x, y);
    };

    ctx.font = font;
    ctx.fillStyle = color || hsl(makeHueFromStr(text), 1, 0.4);
    ctx.textAlign = textAlign;
    drawShadowedParagraph(ctx, text, ...relativeOffset(offset));
  }
}

function readFileAsBuffer(filename) {
  return fs.readFileSync(filename).buffer;
}

class ThumbnailGenerator {
  constructor() {
  }
  async launch() {
    if (this.init) {
      return;
    }
    this.init = true;
    this.CanvasKit = await CanvasKitInit({
      locateFile: file => `${__dirname}/node_modules/canvaskit-wasm/bin/${file}`,
    });

    this.canvas = this.CanvasKit.MakeCanvas(300, 150);
    this.ctx = this.canvas.getContext('2d');

    const lessonFontBuffer = readFileAsBuffer(path.join(__dirname, 'fonts', 'KlokanTechNotoSansCJK-Bold.otf'))
    this.fontMgr = this.CanvasKit.FontMgr.FromData([lessonFontBuffer]);
  }
  async generate(settings) {
    await this.launch();

    const backgroundImageBuffer = readFileAsBuffer(settings.backgroundFilename);
    const backgroundImage = this.CanvasKit.MakeImageFromEncoded(backgroundImageBuffer);

    genThumbnail({
      backgroundImage,
      canvas: this.canvas,
      fontMgr: this.fontMgr,
      CanvasKit: this.CanvasKit,
      ...settings,
    });
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
