
const notIt = _ => _;

function assertEQ(actual, expected, msg = '') {
  if (actual !== expected) {
    throw new Error(`actual: ${actual} does not equal expected: ${expected}: ${msg}`);
  }
}

describe('test lesson-builder', () => {
  it('globs', () => {
    const {glob}  = require('../../utils');
    const files = glob('test/lessons/test-*.md');
    assertEQ(files.length, 1);
    assertEQ(files[0], 'test/lessons/test-one.md');
  });

  it('builds', async () => {
    const buildStuff = require('../../build');
    const buildSettings = {
      outDir: 'test/expected',
      baseUrl: 'https://lesson-builder-test.org',
      rootFolder: 'test',
      tocHanson: 'test/toc.hanson',
      lessonGrep: 'test-*.md',
      siteName: 'Lesson Builder',
      siteThumbnail: 'lesson-builder.png',  // in rootFolder/lessons/resources
      templatePath: 'test/templates',
      owner: 'gfxfundamentals',
      repo: 'lesson-builder',
      thumbnailOptions: {
        thumbnailBackground: 'lesson-builder.png',
        text: [
          {
            font: '100px lesson-font',
            verticalSpacing: 100,
            offset: [100, 120],
            textAlign: 'left',
            shadowOffset: [15, 15],
            strokeWidth: 15,
            textWrapWidth: 1000,
          },
        ],
      },
    };
    await buildStuff(buildSettings);
  });
});