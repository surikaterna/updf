export default function _buildProps(node) {
  const props = Object.assign({}, node.props, { children: node.children });
  return props;
}
