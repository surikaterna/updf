const makeKey = (attr: any) => {
  return attr
    .split(/[-:]/)
    .map((s: any, i: any) => {
      return i === 0 ? s : s[0].toUpperCase() + s.slice(1);
    })
    .join('')
    .trim();
};

const makeValue = (attr: any) => {
  // console.log('A', attr, parseFloat(attr), );
  let result = attr.trim();
  if (result[0] === "'") {
    result = result.substring(1, result.length - 1);
  }
  return result;
};

/**
 * Converts a string such as "fill:none; stroke:none" into a JS object.
 */
export default function asStyle(str: any) {
  const style = {};
  const styles = str.split(';') || [str];
  styles.forEach((stl: any) => {
    if (stl.trim().length > 0) {
      const p = stl.split(':');
      // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      style[makeKey(p[0])] = makeValue(p[1]);
    }
  });
  return style;
}
