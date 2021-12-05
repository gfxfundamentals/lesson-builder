// Because the Skia people apparently don't know JavaScript
// they don't follow JavaScript conventions (T_T)
/* eslint new-cap: 0 */

const fs = require('fs');
const path = require('path');
const CanvasKitInit = require(path.join(__dirname, 'node_modules', 'canvaskit-wasm', 'bin', 'canvaskit.js'));

function readFileAsBuffer(filename) {
  return fs.readFileSync(filename).buffer;
}

// Functions dealing with parsing/stringifying fonts go here.
const fontStringRegex = new RegExp(
  '(italic|oblique|normal|)\\s*' +              // style
  '(small-caps|normal|)\\s*' +                  // variant
  '(bold|bolder|lighter|[1-9]00|normal|)\\s*' + // weight
  '([\\d\\.]+)' +                               // size
  '(px|pt|pc|in|cm|mm|%|em|ex|ch|rem|q)' +      // unit
  // line-height is ignored here, as per the spec
  '(.+)'                                        // family
  );

function stripWhitespace(str) {
  return str.replace(/^\s+|\s+$/, '');
}

const defaultHeight = 16;
// Based off of node-canvas's parseFont
// returns font size in px, which represents the em width.
function parseFontString(fontStr) {

  var font = fontStringRegex.exec(fontStr);
  if (!font) {
    throw new Error(`Invalid font string ${fontStr}`);
  }

  const size = parseFloat(font[4]);
  let sizePx = defaultHeight;
  const unit = font[5];
  switch (unit) {
    case 'em':
    case 'rem':
      sizePx = size * defaultHeight;
      break;
    case 'pt':
      sizePx = size * 4/3;
      break;
    case 'px':
      sizePx = size;
      break;
    case 'pc':
      sizePx = size * defaultHeight;
      break;
    case 'in':
      sizePx = size * 96;
      break;
    case 'cm':
      sizePx = size * 96.0 / 2.54;
      break;
    case 'mm':
      sizePx = size * (96.0 / 25.4);
      break;
    case 'q': // quarter millimeters
      sizePx = size * (96.0 / 25.4 / 4);
      break;
    case '%':
      sizePx = size * (defaultHeight / 75);
      break;
  }
  return {
    'style':   font[1],
    'variant': font[2],
    'weight':  font[3],
    'sizePx':  sizePx,
    'family':  font[6].trim(),
  };
}

// null means use the default typeface (which is currently NotoMono)
const fontCache = {
  'Noto Mono': {
    '*': null, // is used if we have this font family, but not the right style/variant/weight
  },
  'monospace': {
    '*': null,
  },
};

// descriptors is like https://developer.mozilla.org/en-US/docs/Web/API/FontFace/FontFace
// The ones currently supported are family, style, variant, weight.
function addToFontCache(typeface, descriptors) {
  var key = (descriptors['style']   || 'normal') + '|' +
            (descriptors['variant'] || 'normal') + '|' +
            (descriptors['weight']  || 'normal');
  var fam = descriptors['family'];
  if (!fontCache[fam]) {
    // preload with a fallback to this typeface
    fontCache[fam] = {
      '*': typeface,
    };
  }
  fontCache[fam][key] = typeface;
}

function getFromFontCache(descriptors) {
  var key = (descriptors['style']   || 'normal') + '|' +
            (descriptors['variant'] || 'normal') + '|' +
            (descriptors['weight']  || 'normal');
  var fam = descriptors['family'];
  if (!fontCache[fam]) {
    return null;
  }
  return fontCache[fam][key] || fontCache[fam]['*'];
}

function getTypeface(fontstr) {
  var descriptors = parseFontString(fontstr);
  var typeface = getFromFontCache(descriptors);
  descriptors['typeface'] = typeface;
  return descriptors;
}

const kColorMap = {
  'aliceblue': 0xeff8ff,
  'antiquewhite': 0xf9ebd6,
  'aqua': 0x00ffff,
  'aquamarine': 0x7effd3,
  'azure': 0xefffff,
  'beige': 0xf5f5dc,
  'bisque': 0xffe3c4,
  'black': 0x000000,
  'blanchedalmond': 0xffebcd,
  'blue': 0x0000ff,
  'blueviolet': 0x892be1,
  'brown': 0xa42a2a,
  'burlywood': 0xdeb886,
  'cadetblue': 0x5f9e9f,
  'chartreuse': 0x7eff00,
  'chocolate': 0xd2691e,
  'coral': 0xff7e50,
  'cornflowerblue': 0x6394ec,
  'cornsilk': 0xfff8dc,
  'crimson': 0xdc133b,
  'cyan': 0x00ffff,
  'darkblue': 0x00008a,
  'darkcyan': 0x008a8a,
  'darkgoldenrod': 0xb8850a,
  'darkgray': 0xa9a9a9,
  'darkgreen': 0x006300,
  'darkgrey': 0xa9a9a9,
  'darkkhaki': 0xbcb76b,
  'darkmagenta': 0x8a008a,
  'darkolivegreen': 0x546b2e,
  'darkorange': 0xff8b00,
  'darkorchid': 0x9931cc,
  'darkred': 0x8a0000,
  'darksalmon': 0xe99579,
  'darkseagreen': 0x8fbb8f,
  'darkslateblue': 0x473c8a,
  'darkslategray': 0x2e4f4f,
  'darkslategrey': 0x2e4f4f,
  'darkturquoise': 0x00ced1,
  'darkviolet': 0x9300d2,
  'deeppink': 0xff1392,
  'deepskyblue': 0x00beff,
  'dimgray': 0x696969,
  'dimgrey': 0x696969,
  'dodgerblue': 0x1e90ff,
  'firebrick': 0xb12121,
  'floralwhite': 0xfff9ef,
  'forestgreen': 0x218a21,
  'fuchsia': 0xff00ff,
  'gainsboro': 0xdcdcdc,
  'ghostwhite': 0xf8f8ff,
  'gold': 0xffd600,
  'goldenrod': 0xdaa41f,
  'gray': 0x808080,
  'green': 0x008000,
  'greenyellow': 0xacff2e,
  'grey': 0x808080,
  'honeydew': 0xefffef,
  'hotpink': 0xff69b4,
  'indianred': 0xcd5c5c,
  'indigo': 0x4a0082,
  'ivory': 0xffffef,
  'khaki': 0xefe68b,
  'lavender': 0xe6e6f9,
  'lavenderblush': 0xffeff5,
  'lawngreen': 0x7bfb00,
  'lemonchiffon': 0xfff9cd,
  'lightblue': 0xacd7e6,
  'lightcoral': 0xef8080,
  'lightcyan': 0xdfffff,
  'lightgoldenrodyellow': 0xf9f9d2,
  'lightgray': 0xd2d2d2,
  'lightgreen': 0x90ed90,
  'lightgrey': 0xd2d2d2,
  'lightpink': 0xffb6c1,
  'lightsalmon': 0xff9f79,
  'lightseagreen': 0x1fb1aa,
  'lightskyblue': 0x86cef9,
  'lightslategray': 0x778799,
  'lightslategrey': 0x778799,
  'lightsteelblue': 0xafc4de,
  'lightyellow': 0xffffdf,
  'lime': 0x00ff00,
  'limegreen': 0x31cd31,
  'linen': 0xf9efe6,
  'magenta': 0xff00ff,
  'maroon': 0x800000,
  'mediumaquamarine': 0x66cdaa,
  'mediumblue': 0x0000cd,
  'mediumorchid': 0xb954d2,
  'mediumpurple': 0x926fdb,
  'mediumseagreen': 0x3bb370,
  'mediumslateblue': 0x7a68ed,
  'mediumspringgreen': 0x00f99a,
  'mediumturquoise': 0x47d1cc,
  'mediumvioletred': 0xc61485,
  'midnightblue': 0x18186f,
  'mintcream': 0xf5fff9,
  'mistyrose': 0xffe3e0,
  'moccasin': 0xffe3b5,
  'navajowhite': 0xffdeac,
  'navy': 0x000080,
  'oldlace': 0xfcf5e6,
  'olive': 0x808000,
  'olivedrab': 0x6b8e22,
  'orange': 0xffa400,
  'orangered': 0xff4500,
  'orchid': 0xda6fd5,
  'palegoldenrod': 0xede8aa,
  'palegreen': 0x97fa97,
  'paleturquoise': 0xaeeded,
  'palevioletred': 0xdb6f92,
  'papayawhip': 0xffeed4,
  'peachpuff': 0xffdab8,
  'peru': 0xcd853e,
  'pink': 0xffc0ca,
  'plum': 0xdd9fdd,
  'powderblue': 0xafdfe6,
  'purple': 0x800080,
  'rebeccapurple': 0x663399,
  'red': 0xff0000,
  'rosybrown': 0xbb8f8f,
  'royalblue': 0x4169e0,
  'saddlebrown': 0x8a4513,
  'salmon': 0xf98071,
  'sandybrown': 0xf4a35f,
  'seagreen': 0x2d8a56,
  'seashell': 0xfff5ed,
  'sienna': 0x9f522c,
  'silver': 0xc0c0c0,
  'skyblue': 0x86ceeb,
  'slateblue': 0x6a5acd,
  'slategray': 0x6f8090,
  'slategrey': 0x6f8090,
  'snow': 0xfff9f9,
  'springgreen': 0x00ff7e,
  'steelblue': 0x4682b4,
  'tan': 0xd2b48b,
  'teal': 0x008080,
  'thistle': 0xd7bed7,
  'tomato': 0xff6246,
  'transparent': 0x000000,
  'turquoise': 0x40dfd0,
  'violet': 0xed82ed,
  'wheat': 0xf5deb3,
  'white': 0xffffff,
  'whitesmoke': 0xf5f5f5,
  'yellow': 0xffff00,
  'yellowgreen': 0x9acd31,
};
Object.entries(kColorMap).forEach((k, v) => {
  kColorMap[k] = Float32Array.of((v >> 16) /  255, ((v >> 8) & 0xFF) / 255, (v & 0xFF) / 255, 1);
});

function parseColor(CanvasKit, colorStr) {
  CanvasKit.parseColorString(colorStr, kColorMap);
}

function toBase64String(bytes) {
  if (typeof Buffer !== 'undefined') { // Are we on node?
    return Buffer.from(bytes).toString('base64');
  } else {
    // From https://stackoverflow.com/a/25644409
    // because the naive solution of
    //     btoa(String.fromCharCode.apply(null, bytes));
    // would occasionally throw "Maximum call stack size exceeded"
    var CHUNK_SIZE = 0x8000; //arbitrary number
    var index = 0;
    var length = bytes.length;
    var result = '';
    var slice;
    while (index < length) {
      slice = bytes.slice(index, Math.min(index + CHUNK_SIZE, length));
      result += String.fromCharCode.apply(null, slice);
      index += CHUNK_SIZE;
    }
    return btoa(result);
  }
}

function toImageFileData(CanvasKit, surface, codec, quality) {
  surface.flush();
  const img = surface.makeImageSnapshot();
  if (!img) {
    throw new Error('no snapshot');
  }
  codec = codec || 'image/png';
  let format = CanvasKit.ImageFormat.PNG;
  if (codec === 'image/jpeg') {
    format = CanvasKit.ImageFormat.JPEG;
  }
  quality = quality || 0.92;
  const imgBytes = img.encodeToBytes(format, quality);
  if (!imgBytes) {
    throw new Error('encoding failure');
  }
  img.delete();
  return imgBytes;
}

function toDataURL(CanvasKit, surface, codec, quality) {
  const imgBytes = toImageFileData(CanvasKit. surface, codec, quality);
  return `data:${codec};base64,${toBase64String(imgBytes)}`;
}

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
      throw new Error(`unknown alignment: ${align}`);
  }
}

function genThumbnail(options) {
  const {
    backgroundImage,
    canvas,
    text,
    CanvasKit,
    fontMgr,
    font,
  } = options;

  const sharedPaint = new CanvasKit.Paint();
  sharedPaint.setAntiAlias(true);
  sharedPaint.setStrokeMiter(10);
  sharedPaint.setStrokeCap(CanvasKit.StrokeCap.Butt);
  sharedPaint.setStrokeJoin(CanvasKit.StrokeJoin.Miter);

  function relativeOffset(offset) {
    return [
      offset[0] >= 0 ? offset[0] : backgroundImage.width()  + offset[0],
      offset[1] >= 0 ? offset[1] : backgroundImage.height() + offset[1],
    ];
  }

  function makeHueFromStr(text) {
    let s = 0;
    for (let i = 0; i < text.length; ++i) {
      s += text.codePointAt(i);
    }
    return s / 100 % 1;
  }

  canvas.drawImage(backgroundImage, 0, 0, null);

  for (const t of text) {
    const {
      text,
      font: fontStr,
      verticalSpacing, // 100
      offset,  // 100, 120
      shadowOffset,  // 15
      strokeWidth,  // 15
      textWrapWidth,  // 1000
      color,
      textAlign,
    } = t;

    const makeStrokePaint = (strokeStyle, strokeWidth) => {
      const paint = sharedPaint.copy();
      paint.setStyle(CanvasKit.PaintStyle.Stroke);
      const alphaColor = CanvasKit.multiplyByAlpha(strokeStyle, 1.0);
      paint.setColor(alphaColor);
      paint.setStrokeWidth(strokeWidth);
      paint.dispose = function() {
        this.delete();
      };
      return paint;
    };

    const makeFillPaint = (fillStyle) => {
      const paint = sharedPaint.copy();
      paint.setStyle(CanvasKit.PaintStyle.Fill);
      const alphaColor = CanvasKit.multiplyByAlpha(fillStyle, 1.0);
      paint.setColor(alphaColor);
      paint.dispose = function() {
        this.delete();
      };
      return paint;
    };

    const drawParagraph = function drawParagraph(fontStr, text, x, y, color, textAlign, strokeWidth) {
      const tf = getTypeface(fontStr);
      if (tf) {
        font.setSize(tf.sizePx);
        font.setTypeface(tf.typeface);
      }
      const paint = strokeWidth !== undefined ? makeStrokePaint(color, strokeWidth) : makeFillPaint(color);
      const blob = CanvasKit.TextBlob.MakeFromText(text, font);
      canvas.drawTextBlob(blob, x, y, paint);
      blob.delete();
      paint.dispose();

      /*
      const paraStyle = new CanvasKit.ParagraphStyle({
        textStyle: {
          color: parseColor(CanvasKit, color),
          fontFamilies: ['KlolanTech Noto Sans CJK'],
        },
        textAlign: textAlignToCanvasKitAlign(CanvasKit, textAlign),
        maxLines: 7,
        ellipsis: '...',
      });

      const builder = CanvasKit.ParagraphBuilder.Make(paraStyle, fontMgr);
      builder.addText(text);
      const paragraph = builder.build();
      paragraph.layout(textWrapWidth);
      canvas.drawParagraph(paragraph, x, y);
      */

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

    const drawShadowedParagraph = function drawShadowedParagraph(fontStr, text, x, y, color, textAlign, strokeWidth) {
      drawParagraph(fontStr, text, x + shadowOffset[0], y + shadowOffset[1], 'black', textAlign, strokeWidth);
      drawParagraph(fontStr, text, x + shadowOffset[0], y + shadowOffset[1], 'black', textAlign);
      drawParagraph(fontStr, text, x, y, 'white', textAlign, strokeWidth);
      drawParagraph(fontStr, text, x, y, color, textAlign);
    };

    drawShadowedParagraph(fontStr, text, ...relativeOffset(offset), color || hsl(makeHueFromStr(text), 1, 0.4), textAlign, strokeWidth);
  }
}

async function main() {
  const CanvasKit = await CanvasKitInit({
    locateFile: file => `${__dirname}/node_modules/canvaskit-wasm/bin/${file}`,
  });
  const lessonFontBuffer = readFileAsBuffer(path.join(__dirname, 'fonts', 'KlokanTechNotoSansCJK-Bold.otf'));
  const fontMgr = CanvasKit.FontMgr.FromData([lessonFontBuffer]);
  const font = new CanvasKit.Font(null, 10);

  const backgroundFilename = path.join(__dirname, 'test', 'lessons', 'resources', 'lesson-builder.png');
  const backgroundImageData = readFileAsBuffer(backgroundFilename);
  const backgroundImage = CanvasKit.MakeImageFromEncoded(backgroundImageData);

  const surface = CanvasKit.MakeSurface(backgroundImage.width(), backgroundImage.height());
  if (!surface) {
    throw 'Could not make surface';
  }
  const skCanvas = surface.getCanvas();

  genThumbnail({
    CanvasKit,
    canvas: skCanvas,
    fontMgr,
    font,
    backgroundImage,
    text: [
      {
        font: 'bold 100px lesson-font',
        text: 'place-holder',
        verticalSpacing: 100,
        offset: [100, 120],
        textAlign: 'left',
        shadowOffset: [15, 15],
        strokeWidth: 15,
        textWrapWidth: 1000,
      },
      {
        font: 'bold 60px lesson-font',
        text: 'lesson-builder',
        verticalSpacing: 100,
        offset: [-100, -90],
        textAlign: 'right',
        shadowOffset: [8, 8],
        strokeWidth: 15,
        textWrapWidth: 1000,
        color: 'hsl(340, 100%, 70%)',
      },
    ],
  });

  fs.writeFileSync('test.png', toImageFileData(CanvasKit, surface));

  console.log('img1'); backgroundImage.delete();
  //console.log('canvas'); skCanvas.delete();
  console.log('surface'); surface.dispose();
}

main();