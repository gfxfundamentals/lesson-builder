'use strict';
//const fs = require('fs');
const path = require('path');
const ThumbnailGenerator = require('../../thumbnail');

const utils = require('../../utils');

//const notIt = _ => _;

async function diff(a, b) {
  let result;
  try {
    result = await utils.executeP('git', [
       'diff',
       '--no-index',
       a,
       b,
     ]);
  } catch (e) {
    result = e;
  }
  return result;
}

function assertEQ(actual, expected, msg = '') {
  if (actual !== expected) {
    throw new Error(`actual: ${actual} does not equal expected: ${expected}: ${msg}`);
  }
}

function assert(v, msg = '') {
  if (!v) {
    throw new Error(`expected: ${msg}`);
  }
}

/*
async function diffTree(a, b) {
  const afiles = fs.readdirSync(a).sort();
  const bfiles = fs.readdirSync(b).sort();

  const addFiles = (files, id, both) => {
    for (const file of files) {
      both.set(file, (both.get(file) || '') + id);
    }
  };

  const both = new Map();
  addFiles(afiles, 'a', both);
  addFiles(bfiles, 'b', both);

  const diffs = [];
  const files = [...both.keys()].sort();
  for (const file of files) {
    const id = both.get(file);
    if (id === 'ab') {
      const afile = path.join(a, file);
      const bfile = path.join(b, file);
      const astat = fs.statSync(afile);
      const bstat = fs.statSync(bfile);
      if (astat.isDirectory() === bstat.isDirectory()) {
        if (astat.isDirectory()) {
          const subDiffs = await diffTree(afile, bfile);
          diffs.splice(diffs.length, 0, ...subDiffs);
        } else {
          const astr = fs.readFileSync(afile, {encoding: 'utf8'});
          const bstr = fs.readFileSync(bfile, {encoding: 'utf8'});
          const newDiffs = diff(afile, bfile);
          if (newDiffs) {
            diffs.splice(diffs.length, 0, newDiffs);
          }
        }
      } else {
        if (astat.isDirectory()) {
          diffs.push(`${file} is in directory in ${a} but file ${b}`);
        } else {
          diffs.push(`${file} is in file in ${a} but directory ${b}`);
        }
      }
    } else if (id === 'a') {
      diffs.push(`${file} is in ${a} but not in ${b}`);
    } else if (id === 'b') {
      diffs.push(`${file} is in ${b} but not in ${a}`);
    } else {
      throw new Error('should never get here');
    }
  }
  return diffs;
}
*/
async function diffTree(a, b) {
  return await diff(a, b);
}


describe('test lesson-builder', () => {
  it('globs', () => {
    const {glob}  = require('../../utils');
    const files = glob('test/lessons/test-*.md');
    assertEQ(files.length, 1);
    assertEQ(files[0], 'test/lessons/test-one.md');
  });

  it('builds', async() => {
    const buildStuff = require('../../build');
    const outDir = process.env.UPDATE_EXPECTED ? 'test/expected' : 'out';
    const buildSettings = {
      outDir,
      baseUrl: 'https://lesson-builder-test.org',
      rootFolder: 'test',
      tocHanson: 'test/toc.hanson',
      lessonGrep: 'test-*.md',
      siteName: 'Lesson Builder',
      siteThumbnail: 'lesson-builder.png',  // in rootFolder/lessons/resources
      templatePath: 'test/templates',
      owner: 'gfxfundamentals',
      repo: 'lesson-builder',
      feedDate: new Date(2021, 11, 26),
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

    const diffs = await diffTree('test/expected', outDir);
    if (diffs.exitCode !== 0 || diffs.stderr.length !== 0 || diffs.stdout.length !== 0) {
      throw new Error(`${diffs.stdout}\n${diffs.stderr}`);
    }
  });

  it('generates thumbnail', async function() {
    this.timeout(25000);

    let dataURL;
    let thumbGen;
    try {
      thumbGen = new ThumbnailGenerator();
      const settings = {
        backgroundFilename: path.join(__dirname, '..', 'lessons', 'resources', 'lesson-builder.png'),
        text: [
          {
            font: 'bold 100px lesson-font',
            text: 'placeholder',
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
      dataURL = await thumbGen.generate(settings);
    } finally {
      thumbGen.close();
    }
    assertEQ(typeof dataURL, 'string');
    assert(dataURL.startsWith('data:image/png;base64,'), 'dataURL starts with "data:image/png;base64"');
  });

  it('foo', async function() {
    this.timeout(25000);
    const thumbGen = new ThumbnailGenerator();
    const settings = {
      backgroundFilename: `file://${path.join(__dirname, '..', 'lessons', 'resources', 'lesson-builder.png')}`,
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
    const result = await thumbGen.generate(settings);
    console.log('result:', result);
    await thumbGen.close();
  });
});