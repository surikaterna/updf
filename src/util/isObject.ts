const isObject = (obj: unknown): obj is Exclude<object, null> => typeof obj === 'object' && obj !== null;

export default isObject;
