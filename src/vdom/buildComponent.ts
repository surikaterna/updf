import buildProps from './buildProps';

const buildComponent = (node: any, context: any) => node.type(buildProps(node), context);

export default buildComponent;
