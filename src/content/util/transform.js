const toFloat = (v) => parseFloat(v);
const cnv = {
  style: (style) => {
    console.log('STYLE', style);
    return {};
  },
  x1: toFloat,
  y1: toFloat,
  x2: toFloat,
  y2: toFloat,
  cx: toFloat,
  cy: toFloat,
  r: toFloat
}

function convertProps(props) {
  const nProps = {};
  props && Object.keys(props).forEach(prop => {
    const p = props[prop];
    nProps[prop] = cnv[prop] ? cnv[prop](p) : p;
  });
  return nProps || {};
}

export default function transform(root, mapping) {
  const cnstr = mapping[root.type];
  if (!cnstr) {
    if (typeof root === 'string') {
      return root;
    } else {
      console.log('Unknown type', root.type, root);
      return null;
    }
  }
  return cnstr(convertProps(root.props), root.children && root.children.map(ch => transform(ch, mapping)));
}
