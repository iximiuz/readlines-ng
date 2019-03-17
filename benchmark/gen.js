const { randomLine } = require('../test/utils');

function main() {
  if (!process.argv[2]) {
    console.log('Usage: node gen.js <lines-num>');
    process.exit(1);
  }
  let linesNum = parseInt(process.argv[2]);
  while (linesNum-- > 0) {
    console.log(randomLine());
  }
}

main();

