const npec = {
  A: { n: 7 }, a: { n: 7 }, C: { n: 6 }, c: { n: 6 }, H: { n: 1 }, h: { n: 1 }, L: { n: 2 }, l: { n: 2 }, M: { n: 2, h: 'moveTo' }, m: { n: 2 }, Q: { n: 4 }, q: { n: 4 }, S: { n: 4 }, s: { n: 4 }, T: { n: 2 }, t: { n: 2 }, V: { n: 1 }, v: { n: 1 }, Z: { n: 0 }, z: { n: 0 }
};

const collect = (str, p) => {
  let result = [];
  let match;
  while ((match = p.exec(str)) !== null) {
    result.push(match);
  }
  return result;
};

const process = (cmd, args, gfx) => {
  const c = npec[cmd];
  if (args.length !== c.n) {
    throw new Error(cmd + ' ' + args);
  }
  if (c.h) {
    gfx[c.h](...args);
  }
}


export default function pathParser(pathDef, gfx) {
  const cmdPattern = /([astvzqmhlcASTVZQMHLC])((?:[\s,-]*\d+(?:\.\d+)?)+)*/g;
  console.log('\n\nTT');
  collect(pathDef, cmdPattern).forEach(cmd => {
    const c = cmd[1];
    const nDef = cmd[2];
    const args = collect(nDef, /(-?\d+(?:\.\d+)?)/g).map(arg => parseFloat(arg[1], 10));
    console.log(c, args);
    process(c, args, gfx);
  });
}
