const toFloat = (v) => parseFloat(v);
// if returning object it must include an envelope to allow of renaming properties
const cnv = {
  style: (style) => {
    console.log('STL', style);
    return typeof style === 'object' ? { style } : {};
  },
  class: (className) => ({ className }),
  x1: toFloat,
  y1: toFloat,
  x2: toFloat,
  y2: toFloat,
  cx: toFloat,
  cy: toFloat,
  r: toFloat,
  width: toFloat,
  height: toFloat
};

function convertProps(props, rest) {
  const nProps = Object.assign({}, rest);
  props && Object.keys(props).forEach(prop => {
    const p = props[prop];
    const nw = cnv[prop] && cnv[prop](p);
    if (typeof nw === 'object') {
      delete nProps[prop]
      Object.assign(nProps, props[prop], nw, rest && rest[prop] && { [prop]: rest[prop] } || {});
    } else {
      nProps[prop] = nw || p;
    }
  });
  return nProps || {};
}

export default function transform(root, mapping, rest) {
  const cnstr = mapping[root.type];
  if (!cnstr) {
    if (typeof root === 'string') {
      return root;
    } else {
      return null;
    }
  }
  return cnstr(convertProps(root.props, rest), root.children && root.children.map(ch => transform(ch, mapping)));
}
