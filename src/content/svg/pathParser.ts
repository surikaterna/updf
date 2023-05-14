const npec = {
  A: 7,
  a: 7,
  C: 6,
  c: 6,
  H: 1,
  h: 1,
  L: 2,
  l: 2,
  M: 2,
  m: 2,
  Q: 4,
  q: 4,
  S: 4,
  s: 4,
  T: 2,
  t: 2,
  V: 1,
  v: 1,
  Z: 0,
  z: 0
};

export const collect = (str: any, p: any) => {
  let result = [];
  let match;
  while ((match = p.exec(str)) !== null) {
    result.push(match);
  }
  return result;
};

// @ts-expect-error TS(2554): Expected 0-1 arguments, but got 2.
export const collectArguments = (str: any) => collect(str, /([+-]?(?:(?:\d*(?:\.\d+(?:e-\d+)?))|\d+))/g).map((arg) => Number(arg[1], 10));

const process = (cmd: any, args: any, gfx: any) => {
  // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
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

export default function pathParser(pathDef: any, gfx: any) {
  const cmdPattern = /([astvzqmhlcASTVZQMHLC])((?:[\s.,-]*\d+(?:\.\d+)?)+)*/g;
  collect(pathDef, cmdPattern).forEach((cmd) => {
    const c = cmd[1];
    const nDef = cmd[2];
    const args = collectArguments(nDef);
    process(c, args, gfx);
  });
}
