const fs = require('fs');
const path = require('path');
const Foo = require('./thumbnail');

async function main() {
  const foo = new Foo();
  const settings = {
    backgroundFilename: `file://${path.join(__dirname, 'test', 'lessons', 'resources', 'lesson-builder.png')}`,
    //backgroundFilename: `file://${path.join(__dirname, 'foo.png')}`,
    text: [
      {
        font: 'bold 100px lesson-font',
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
  const result = await foo.generate(settings);
  console.log("result:", result);
  await foo.close();
}
main();
