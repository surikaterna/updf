export type RGBValues = [number, number, number];

export default function parseColor(color: string): RGBValues {
  let colorValues: RGBValues;
  let matches: RegExpExecArray | null;
  const clr = color.replace(/\s\s*/g, ''); // Remove all spaces

  if ((matches = /^#([\da-fA-F]{2})([\da-fA-F]{2})([\da-fA-F]{2})/.exec(clr))) {
    colorValues = [parseInt(matches[1], 16), parseInt(matches[2], 16), parseInt(matches[3], 16)];
  } else if ((matches = /^#([\da-fA-F])([\da-fA-F])([\da-fA-F])/.exec(clr))) {
    colorValues = [parseInt(matches[1], 16) * 17, parseInt(matches[2], 16) * 17, parseInt(matches[3], 16) * 17];
  } else if ((matches = /^rgba\(([\d]+),([\d]+),([\d]+),([\d]+|[\d]*.[\d]+)\)/.exec(clr))) {
    colorValues = [+matches[1], +matches[2], +matches[3]];
  } else if ((matches = /^rgb\(([\d]+),([\d]+),([\d]+)\)/.exec(clr))) {
    colorValues = [+matches[1], +matches[2], +matches[3]];
  } else {
    throw Error(clr + ' unable to parse');
  }

  return <RGBValues>colorValues.map((e) => e / 255).slice(0, 3);
}
