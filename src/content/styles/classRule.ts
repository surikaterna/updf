export default (clz, style) => node => {
  return node.props && node.props.className === clz ? style : undefined;
};
