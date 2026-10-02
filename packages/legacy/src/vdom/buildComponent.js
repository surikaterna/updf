import buildProps from './buildProps';

const buildComponent = (node, context) => node.type(buildProps(node), context);

export default buildComponent;
