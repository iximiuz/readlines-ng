exports.randomLine = function randomLine(minLen = 10, maxLen = 1000) {
  let len = minLen + Math.random() * maxLen;
  const line = [];
  while (len-- > 0) {
    line.push(String.fromCharCode(97 + parseInt(Math.random() * 27)));
  }
  return line.join('');
}

