const fs = require('fs');
const { readlines, LineStream } = require('../index.js');

async function wcg(filename, encoding = null) {
  let counter = 0;
  for await (const _ of readlines(filename, { chunkSize: 256*1024, encoding })) {
    counter++;
  }
  return counter;
}

function wcs(filename, encoding = null) {
  const reader = new LineStream(filename, {
    encoding,
    chunkSize: 256*1024,
  });

  let counter = 0;
  reader.on('data', () => counter++);
  return new Promise((res, rej) => {
    reader.once('error', rej);
    reader.once('end', () => res(counter));
    reader.once('close', () => res(counter));
  });
}

function wcrl(filename) {
  const readline = require('readline');
  const reader = readline.createInterface({
    input: fs.createReadStream(filename),
    crlfDelay: Infinity,
  });

  let counter = 0;
  reader.on('line', () => counter++);
  return new Promise((res, rej) => {
    reader.once('error', rej);
    reader.once('end', () => res(counter));
    reader.once('close', () => res(counter));
  });
}

async function bench(name, job) {
  console.log('Benchmark:', name);

  const start = process.hrtime();
  console.log(await job());
  const [s, ns] = process.hrtime(start);

  console.log('Done in', `${s}.${ns}`, 'sec');
  console.log();
}

async function main() {
  if (!process.argv[2]) {
    console.log('Usage: node bench.js </path/to/huge/file>');
    process.exit(1);
  }

  await bench('lines counter (readline module)', () => wcrl(process.argv[2]));
  await bench('lines counter (async generator)', () => wcg(process.argv[2]));
  await bench('lines counter (async generator UTF-8)', () => wcg(process.argv[2], 'utf8'));
  await bench('lines counter (readable stream)', () => wcs(process.argv[2]));
  await bench('lines counter (readable stream UTF-8)', () => wcs(process.argv[2], 'utf8'));
}

main();

