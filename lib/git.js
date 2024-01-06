'use strict';
const utils      = require('./utils');

const s_gitFilenameToDateMaps = {
  ctimeMs: {
    map: new Map(),
  },
  mtimeMs: {
    map: new Map(),
  },
};

async function dateFromGitLog(fs, filename, timeType) {
  const mapInfo = s_gitFilenameToDateMaps[timeType];
  if (!mapInfo.read) {
    mapInfo.read = true;
    const result = await utils.executeP('git', [
        'log',
        '--format=%cd',
        '--date=unix',
        '--name-only',
        ...(timeType === 'ctimeMs' ? ['--diff-filter=A'] : ['--diff-filter=AM']),
    ]);
    const numberRE = /^\d+$/;
    const lines = result.stdout.split('\n');
    let currentDate;
    for (const line of lines) {
      if (numberRE.test(line)) {
        const seconds = parseInt(line);
        if (!isNaN(seconds)) {
          currentDate = new Date(seconds * 1000);
        }
      } else if (line.length > 2) {
        const filename = line.trim();
        mapInfo.map.set(filename, mapInfo.map.get(filename) || currentDate);
      }
    }
  }
  const date = mapInfo.map.get(filename);
  if (date) {
    return date;
  }
  const stat = fs.statSync(filename);
  console.log('got date', stat[timeType], 'from filename:', filename);
  return new Date(stat[timeType]);
}

module.exports = {
  dateFromGitLog,
};
