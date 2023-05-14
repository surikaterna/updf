import isComponent from './isComponent';
import buildComponent from './buildComponent';
import text from '../content/text';

/**
 * Reduces the tree - meaning will "solve" all user components and only native components will remain
 */
export default function reduce(vnode, context) {
  let node = vnode;
  // traverse all components until we get a node which is a "proper" vdom node
  while (isComponent(node)) {
    node = buildComponent(node, context);
  }

  if (typeof (node) === 'string') {
    node = text({ str: node });
  }

  let children;
  if (node === null) {
    throw new Error('Null returned from render fn');
    //node = {};
  } else if (Array.isArray(node)) {
    // For convenience, fake it into a seq vnode
    children = node;
  } else {
    children = node.children;
  }

  if (children) {
    //console.log('>>', node.type, children);
    const chlds = children.map(child => reduce(child, context));
    node.children = chlds;
  }

  return node;
}
