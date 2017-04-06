import _buildProps from '../vdom/buildProps';

export default function _render(vnode, context) {
  //if(Array.isArray(vnode))
  return vnode.render(_buildProps(vnode), context);
}
