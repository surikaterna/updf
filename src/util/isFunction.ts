const isFunction = (obj: unknown): obj is Function => typeof obj === 'function';

export default isFunction;
