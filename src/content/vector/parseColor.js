export default function parseColor(color) {
  let m;
  const clr = color.replace(/\s\s*/g, ''); // Remove all spaces

  if (m = /^#([\da-fA-F]{2})([\da-fA-F]{2})([\da-fA-F]{2})/.exec(clr))
    m = [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];

  else if (m = /^#([\da-fA-F])([\da-fA-F])([\da-fA-F])/.exec(clr))
    m = [parseInt(m[1], 16) * 17, parseInt(m[2], 16) * 17, parseInt(m[3], 16) * 17];

  else if (m = /^rgba\(([\d]+),([\d]+),([\d]+),([\d]+|[\d]*.[\d]+)\)/.exec(clr))
    m = [+m[1], +m[2], +m[3], +m[4]];

  else if (m = /^rgb\(([\d]+),([\d]+),([\d]+)\)/.exec(clr))
    m = [+m[1], +m[2], +m[3]];

  else throw Error(clr + ' unable to parse');
  m = m.map(e => e / 255);
  return m.slice(0, 3);
}
