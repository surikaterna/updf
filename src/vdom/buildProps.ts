export default function buildProps(node: any) {
  const props = Object.assign({}, node.props, { children: node.children });
  return props;
}
