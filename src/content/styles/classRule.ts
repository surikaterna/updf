export default (clz: any, style: any) => (node: any) => {
  return node.props && node.props.className === clz ? style : undefined;
};
