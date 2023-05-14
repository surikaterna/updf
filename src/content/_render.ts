import _buildProps from '../vdom/buildProps';

export default function _render(vnode: any, context: any) {
  //if(Array.isArray(vnode))
  return vnode.render(_buildProps(vnode), context);
}
