# Tiny async generator to read files line by line

Node 10+ is required. Only file reading via `fs.open()` and `fs.read()` is supported at the moment.

## Usage examples:
```javascript
  const { readline, LineStream } = require('line-reader-gen');

  // As a generator
  for await (const line of readline(filename, { encoding: 'utf8' })) {
    console.log(line);
  }

  // As a readable stream
  const reader = new LineStream(filename, {
    chunkSize: 256*1024,
    encoding: null,
  });
  for await (const line of reader) {
    console.log(line);
  }
```

## Tests & Benchmark
```
npm run test
npm run bench
```
