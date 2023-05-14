import createElement from './element';

function isChildren(x) {
  return typeof x === 'string' || typeof x === 'number' || Array.isArray(x);
}

/**
 * Pragma pack
 */
export default (component, render) => (properties, children) => {
  let p = properties;
  let c = children;
  if (!c && isChildren(p)) {
    c = p;
    p = {};
  } else if (!c) {
    c = [];
  }
  // if children is no array, wrap it into an array
  if (!Array.isArray(c)) {
    c = [c];
  }
  return createElement(component, p, c, render);
};

