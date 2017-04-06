import isFunction from '../util/isFunction';

const isComponent = (node) => node.type && isFunction(node.type);

export default isComponent;
