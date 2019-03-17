const fs = require('fs');
const { readlines, LineStream } = require('../index.js');

async function wcg(filename) {
  let counter = 0;
  for await (const _ of readlines(filename, { chunkSize: 256*1024, encoding: null })) {
    counter++;
  }
  return counter;
}

function wcs(filename) {
  const reader = new LineStream(filename, {
    chunkSize: 256*1024,
    encoding: null,
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

  console.log('Done in', `${s}.${ns}`);
}

async function main() {
  if (!process.argv[2]) {
    console.log('Usage: node bench.js </path/to/huge/file>');
    process.exit(1);
  }

  await bench('line counter (async generator)', () => wcg(process.argv[2]));
  await bench('line counter (readable stream)', () => wcs(process.argv[2]));
  await bench('line counter (readline module)', () => wcrl(process.argv[2]));
}

main();

