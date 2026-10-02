export default function buildProps(node) {
  const props = Object.assign({}, node.props, { children: node.children });
  return props;
}
