const assert  = require('assert');
const fs = require('fs');
const path = require('path');

const utils = require('./utils');
const { LineStream } = require('../index.js');

async function testit() {
  await Promise.all([
    testone(1, 1),
    testone(2, 2),
  ]);

  const tests = [];
  for (let i = 0; i < 10; i++) {
    tests.push(testone(i + 3, 2 + parseInt(Math.random() * 16 * 1024)));
  }
  await Promise.all(tests);
}

async function testone(testNo, linesNum) {
  const filename = path.join(__dirname, `fixture${testNo}.txt`);
  const file = await fs.promises.open(filename, 'w');
  let fileSize = 0;
  try {
    for (let i = 0; i < linesNum; i++) {
      const line = utils.randomLine()
      await file.write(i === 0 ? line : ('\n' + line));
      fileSize += line.length;
    }
  } finally {
    await file.close();
  }

  const { fileSize: actualSize, linesNum: actualLinesNum } = await readFile(filename);
  await fs.promises.unlink(filename);

  assert(
    fileSize === actualSize, 
    `expected size is ${fileSize}, actual size is ${actualSize}`,
  );
  assert(
    linesNum === actualLinesNum,
    `expected line number is ${linesNum}, actual line number is ${actualLinesNum}`,
  );
}

async function readFile(filename) {
  const reader = new LineStream(filename, {
    chunkSize: 256*1024,
    encoding: null,
  });

  let fileSize = 0;
  let linesNum = 0;
  for await (const line of reader) {
    linesNum += 1;
    fileSize += line.length;
  }
  return { fileSize, linesNum};
}

testit();

