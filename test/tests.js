const assert  = require('assert');
const fs = require('fs');
const path = require('path');
const stream = require('stream');

const utils = require('./utils');
const { LineStream } = require('../index.js');

async function testCustomSep() {
  const datasource = new stream.PassThrough();
  assert(datasource.write('abc42'));
  assert(datasource.write('qux42'));
  assert(datasource.write('foobar42'));
  assert(datasource.write('42'));
  datasource.end();

  const { bytes, lines } = await countLines(datasource, 10, 'utf8', '42');
  assert.equal(lines, 4);
  assert.equal(bytes, 18);
}

async function testMulti(encoding) {
  await Promise.all([
    testOne(0, 1, encoding),
    testOne(1, 1, encoding),
    testOne(2, 2, encoding),
  ]);

  const tests = [];
  for (let i = 0; i < 10; i++) {
    tests.push(testOne(i + 3, 2 + parseInt(Math.random() * 16 * 1024), encoding));
  }
  await Promise.all(tests);
}

async function testOne(testNo, linesNum, encoding) {
  const filename = path.join(__dirname, `fixture${testNo}.txt`);
  const file = await fs.promises.open(filename, 'w');
  let fileSize = 0;
  try {
    for (let i = 0; i < linesNum; i++) {
      const line = (i && '\n' || '') + utils.randomLine();
      await file.write(line);
      fileSize += line.length;
    }
  } finally {
    await file.close();
  }

  const chunkSize = 1 + parseInt(Math.random() * 1024 * 256);
  const { bytes, lines } = await countLines(filename, chunkSize, encoding);

  await fs.promises.unlink(filename);

  assert.equal(fileSize, bytes); 
  assert.equal(linesNum, lines);
}

async function testReadableError() {
  let counter = 0;
  const datasource = new stream.Readable({
    read(size) {
      if (counter === 0) {
        counter++;
        this.push('abc\n');
      } else {
        process.nextTick(() => this.emit('error', new Error('Hi there')));
      }
    }
  });

  let err;
  try {
    const rv = await countLines(datasource, 1, 'utf8');
  } catch (e) {
    err = e;
  }

  assert(err);
  assert.equal(err.message, 'Hi there');
}

async function countLines(input, chunkSize, encoding, sep = '\n') {
  const reader = new LineStream(input, {
    sep,
    chunkSize,
    encoding,
  });

  let bytes = 0;
  let lines = 0;
  for await (const line of reader) {
    bytes += line.length + sep.length;
    lines += 1;
  }
  bytes -= sep.length;  // last line

  return { bytes, lines };
}

(async function() {
  console.log('Testing...');
  await testCustomSep();
  await testMulti();
  await testMulti('utf8');
  await testReadableError();
  console.log('Success!');
})();

