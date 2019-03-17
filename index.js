const assert = require('assert');
const fs = require('fs');
const stream = require('stream');

async function* readlines(input, options = {}) {
  options = {
    sep: '\n',
    encoding: 'utf8', 
    chunkSize: 1024, 
    ...options,
  };

  let builder;
  if (options.encoding) {
    builder = new StringLineBuilder(options.sep);
  } else {
    const sep = (typeof options.sep === 'string') 
      ? Buffer.from(options.sep, 'utf8') 
      : options.sep;
    builder = new ByteLineBuilder(sep);
  }

  const reader = toReadable(input, options);
  for await (const chunk of reader) {
    builder.append(chunk);

    while (true) {
      const line = builder.nextLine();
      if (line === undefined) {
        break;
      }
      yield line;
    }
  }

  const line = builder.lastLine();
  if (line !== undefined) {
    yield line;
  }
}

/**
 * Trivial string builder based on append + indexOf.
 */
class StringLineBuilder {
  constructor(sep) {
    assert(typeof sep === 'string');
    this.sep = sep;
    this.sepSize = sep.length;
    this.buf = '';
    this.searchOffset = 0;
  }

  append(chunk) {
    this.buf += chunk;
  }

  nextLine() {
    const pos = this.buf.indexOf(this.sep, this.searchOffset);
    if (pos === -1) {
      return undefined;
    }

    const line = this.buf.slice(0, pos);
    this.buf = this.buf.slice(pos + this.sepSize);
    this.searchOffset = 0;
    return line;
  }

  lastLine() {
    return this.buf || undefined;
  }
}

/**
 * Optimized for reducing memory allocation builder.
 */
class ByteLineBuilder {
  constructor(sep) {
    assert(sep instanceof Buffer);
    this.sep = sep;
    this.sepSize = sep.length;

    this.buf = Buffer.allocUnsafe(1024);
    this.bufSize = 0;
    this.consumed = 0;
    this.searchOffset = 0;
  }

  append(chunk) {
    const chunkSize = chunk.length;
    if (chunkSize === 0) {
      return;
    }

    if (this.buf.length - this.bufSize < chunkSize) {
      this._realloc(chunkSize);
    }

    chunk.copy(this.buf, this.bufSize); 
    this.bufSize += chunkSize;
  }

  nextLine() {
    const pos = this.buf.indexOf(this.sep, this.searchOffset);
    if (pos === -1 || pos >= this.bufSize) {
      this.searchOffset = Math.max(0, this.bufSize - this.sepSize + 1);
      return undefined;
    }

    const line = this.buf.slice(this.consumed, pos);
    this.consumed = pos + this.sepSize;
    this.searchOffset = pos + this.sepSize;
    return line;
  }

  lastLine() {
    return (this.bufSize - this.consumed > 0) 
      ? this.buf.slice(this.consumed, this.bufSize) 
      : undefined;
  }

  _realloc(extraSpace) {
    const toConsume = this.bufSize - this.consumed;
    const freeSpace = this.buf.length - toConsume;
    if (toConsume <= this.consumed && freeSpace >= extraSpace) {
      // repack
      this.buf.copy(this.buf, 0, this.consumed, this.bufSize);
    } else {
      // double capacity
      let cap = this.buf.length << 1;
      const minCap = (toConsume + extraSpace) << 1;
      while (cap < minCap) {
        cap <<= 1;
      }

      const buf = Buffer.allocUnsafe(cap);
      this.buf.copy(buf, 0, this.consumed, this.bufSize);
      this.buf = buf;
    }

    this.bufSize = toConsume;
    this.consumed = 0;
    this.searchOffset = 0;
  }
}

function toReadable(input, options) {
  if (typeof input === 'string') {
    const reader = fs.createReadStream(input, { 
      encoding: options.encoding,
      highWaterMark: options.chunkSize 
    });
    return reader;
  }
  if (input instanceof stream.Readable) {
    return input;
  }
  throw new Error('Unsupported input type');
}

class LineStream extends stream.Readable {
  constructor(input, options = {}, readableOptions = {}) {
    super({ ...readableOptions, objectMode: true });
    this._reading = false;
    this._lines = readlines(input, options); 
  }

  _read(size) {
    if (!this._reading) {
      this._reading = true;
      this._resumeReading();
    }
  }

  async _resumeReading() {
    while (true) {
      try {
        const { value: line, done } = await this._lines.next();
        if (done) {
          this.push(null);
          break;
        }

        if (!this.push(line)) {
          this._reading = false;
          break;  // slow down
        }
      } catch (e) {
        process.nextTick(() => this.emit('error', e));
      }
    }
  }
}

module.exports = {
  readlines,
  LineStream,
};

