import _buildProps from '../vdom/buildProps';

export default function _render(vnode: any, context: any) {
  return vnode.render(_buildProps(vnode), context);
}
