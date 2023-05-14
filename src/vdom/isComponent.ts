import isObject from '../util/isObject';
import isFunction from '../util/isFunction';

export type Component = {
  type: Function;
  props: any;
  children: Array<any>;
  treeWillRender?: () => void;
};

const isComponent = (node: unknown): node is Component => isObject(node) && 'type' in node && isFunction(node.type);

export default isComponent;
