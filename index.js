const fs = require('fs');
const stream = require('stream');

async function* readlines(filename, options = {}) {
  const { chunkSize, sep, encoding } = { 
    chunkSize: 1024, 
    sep: '\n', 
    encoding: 'utf8', 
    ...options,
  };
  const sepBytes = Buffer.from(sep, encoding);
  const sepSize = sepBytes.length;
  const handle = await fs.promises.open(filename, 'r');
  try {
    let buf = Buffer.allocUnsafe(chunkSize);
    let bufSize = 0;
    while (true) {
      const { bytesRead } = await handle.read(buf, bufSize, chunkSize);
      bufSize += bytesRead;
      buf = buf.slice(0, bufSize);
      if (bytesRead === 0) {
        if (bufSize > 0) {
            yield encoding === null ? buf : buf.toString(encoding);
        }
        break;
      }

      let searchOffset = Math.max(0, bufSize - bytesRead - sepSize);
      while (true) {
        const sepPos = buf.indexOf(sepBytes, searchOffset);
        if (sepPos === -1) {
          bufSize = buf.length;
          buf = Buffer.concat(
            [buf, Buffer.allocUnsafe(chunkSize)], 
            buf.length + chunkSize,
          );
          break;
        }

        yield (encoding === null) 
          ? buf.slice(0, sepPos)
          : buf.slice(0, sepPos).toString(encoding);

        buf = buf.slice(sepPos + sepSize);
        searchOffset = 0;
      }
    }
  } finally {
    await handle.close();
  }
}

class LineStream extends stream.Readable {
  constructor(filename, options = {}, readableOptions = {}) {
    super({ ...readableOptions, objectMode: true });
    this._reading = false;
    this._lines = readlines(filename, options); 
  }

  _read(size) {
    if (!this._reading) {
      this._reading = true;
      this._resumeReading();
    }
  }

  async _resumeReading() {
    while (true) {
      const { value: line, done } = await this._lines.next();
      if (done) {
        this.push(null);
        break;
      }

      if (!this.push(line)) {
        this._reading = false;
        break;  // slow down
      }
    }
  }
}

module.exports = {
  readlines,
  LineStream,
};

