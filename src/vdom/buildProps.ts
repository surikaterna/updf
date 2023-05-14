import { Component } from './isComponent';

export default function buildProps(node: Component) {
  const props = Object.assign({}, node.props, { children: node.children });
  return props;
}
