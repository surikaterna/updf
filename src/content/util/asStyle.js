const makeKey = (attr) => {
  return attr.split(/[-:]/).map((s, i) => {
    return i === 0 ? s : s[0].toUpperCase() + s.slice(1);
  }).join('').trim();
};

const makeValue = (attr) => {
  // console.log('A', attr, parseFloat(attr), );
  let result = attr.trim();
  if (result[0] === '\'') {
    result = result.substring(1, result.length - 1);
  }
  return result;
};

/**
 * Converts a string such as "fill:none; stroke:none" into a JS object.
 */
export default function asStyle(str) {
  const style = {};
  const styles = str.split(';') || [str];
  styles.forEach(stl => {
    if (stl.trim().length > 0) {
      const p = stl.split(':');
      style[makeKey(p[0])] = makeValue(p[1]);
    }
  });
  return style;
}
