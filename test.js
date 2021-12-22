'use strict';
const fs = require('fs');
const path = require('path');
const ThumbnailGenerator = require('./thumbnail');

async function main() {
  const gen = new ThumbnailGenerator();
  const settings = {
    backgroundFilename: path.join(__dirname, 'test', 'lessons', 'resources', 'lesson-builder.png'),
    fonts: [
      { name: 'lesson-font', filename: path.join(__dirname, 'fonts', 'KlokanTechNotoSansCJK-Bold.otf'), },
    ],
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
  };
  const data = await gen.generate(settings);
  fs.writeFileSync('test.jpg', data);
  await gen.close();
}


main();