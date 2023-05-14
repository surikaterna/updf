import isFunction from '../util/isFunction';

const isComponent = (node: any) => node.type && isFunction(node.type);

export default isComponent;
