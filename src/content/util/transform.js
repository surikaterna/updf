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
  return cnstr(root.props, root.children && root.children.map(ch => transform(ch, mapping)));
}
