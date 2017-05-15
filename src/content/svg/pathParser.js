const npec = {
  A: 7, a: 7, C: 6, c: 6, H: 1, h: 1, L: 2, l: 2, M: 2, m: 2, Q: 4, q: 4, S: 4, s: 4, T: 2, t: 2, V: 1, v: 1, Z: 0, z: 0
};

export const collect = (str, p) => {
  let result = [];
  let match;
  while ((match = p.exec(str)) !== null) {
    // console.log(match);
    result.push(match);
  }
  return result;
};

export const collectArguments = (str) =>
  collect(str, /([+-]?(?:(?:\d*(?:\.\d+(?:e-\d+)?))|\d+))/g).map(arg => Number(arg[1], 10));
//  collect(str, /(-?\d+(?:\.\d+(?:e-)?\d*)?)/g).map(arg => Number(arg[1], 10));

//console.log('args', str.match(/([+-]?(?:\d*(?:\.\d+(?:e-\d+)?))|\d+)/));

const process = (cmd, args, gfx) => {
  const n = npec[cmd];
  if (args.length !== n && args.length % n !== 0) {
    throw new Error('Wrong n args: ' + cmd + ' ' + args + ' ' + args.length + ' ' + n);
  }
  if (cmd && gfx[cmd]) {
    //args can be multiple of expected number of arguments
    if (args.length > n) {
      let run = 0;
      while (args.length > 0) {
        if (run > 0 && (cmd === 'm' || cmd === 'M')) {
          gfx[cmd === 'M' ? 'L' : 'l'](...args.splice(0, n));
        } else {
          gfx[cmd](...args.splice(0, n));
        }
        run++;
      }
    } else {
      gfx[cmd](...args);
    }
  } else {
    console.log('Skipping ', cmd, ...args);
  }
};

export default function pathParser(pathDef, gfx) {
  const cmdPattern = /([astvzqmhlcASTVZQMHLC])((?:[\s.,-]*\d+(?:\.\d+)?)+)*/g;
  collect(pathDef, cmdPattern).forEach(cmd => {
    const c = cmd[1];
    const nDef = cmd[2];
    const args = collectArguments(nDef);
    process(c, args, gfx);
  });
}
