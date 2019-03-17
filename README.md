# Tiny and fast async generator to read streams line by line

[![Build Status](https://travis-ci.org/iximiuz/readlines-ng.svg)](https://travis-ci.org/iximiuz/readlines-ng)

**Node 10+ is required.** This package provides very simple but feature-reach functionality to consume readable streams or files line by line. It's also quite fast (up to 30% faster than [`readline`](https://nodejs.org/api/readline.html#readline_example_read_file_stream_line_by_line)) and has no dependencies.

## Features:
- reading of files (by name)
- reading of readable streams 
- generator mode via `readlines`
- readable stream mode via `LineStream`
- customizable separator (default is `\n`)
- raw bytes mode if `encoding` option is `null`
- configurable lookahead buffer size

## Documentation
Have a look at the `index.js`, it's really tiny. Or check the usage example below.

## Usage examples:
```javascript
const { readlines, LineStream } = require('readlines-ng');

// As a generator
for await (const line of readlines(filename, { encoding: 'utf8' })) {
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

// Custom separator
const { PassThrough } = require('stream');
const datasource = new PassThrough();
datasource.write('qux42');
datasource.write('foobar42');
datasource.end();

const reader = new LineStream(filename, { sep: '42' });
for await (const line of reader) {
  console.log(line);
}
```

## Tests 
```bash
npm run test
```

## Benchmark
Trivial `wc -l` impl using this package exposes the performance better than the standard [`readline`](https://nodejs.org/api/readline.html#readline_example_read_file_stream_line_by_line) module.
```bash
npm run bench </path/to/huge/file>  # Node 11+ is required

# File size ~2.8 GB
> Benchmark: lines counter (readline module)
> 5974719 lines found
> Done in 5.757290349 sec

> Benchmark: lines counter (async generator)
> 5974719 lines found
> Done in 4.707053160 sec

> Benchmark: lines counter (async generator UTF-8)
> 5974719 lines found
> Done in 3.937784544 sec

> Benchmark: lines counter (readable stream)
> 5974719 lines found
> Done in 4.984460949 sec

> Benchmark: lines counter (readable stream UTF-8)
> 5974719 lines found
> Done in 4.354594750 sec
```

