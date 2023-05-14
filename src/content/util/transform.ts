import asStyle from '../util/asStyle';

// if returning object it must include an envelope to allow of renaming properties
const cnv = {
  style: (style: any) => {
    return typeof style === 'object' ? { style } : { style: asStyle(style) };
  },
  class: (className: any) => ({
    className
  }),
  x1: Number,
  y1: Number,
  x2: Number,
  y2: Number,
  cx: Number,
  cy: Number,
  x: Number,
  y: Number,
  r: Number,
  rx: Number,
  ry: Number,
  width: Number,
  height: Number
};

function convertProps(props: any, rest: any) {
  const nProps = Object.assign({}, rest);
  props && Object.keys(props).forEach(prop => {
    const p = props[prop];
    // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
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

export default function transform(root: any, mapping: any, rest: any) {
  const cnstr = mapping[root.type];
  if (!cnstr) {
    if (typeof root === 'string') {
      return root;
    } else {
      throw new Error('Unable to map ' + root.type);
    }
  }
  // @ts-expect-error TS(2554): Expected 3 arguments, but got 2.
  return cnstr(convertProps(root.props, rest), root.children && root.children.map((ch: any) => transform(ch, mapping)));
}
