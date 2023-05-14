import { Component } from './isComponent';
import buildProps from './buildProps';

const buildComponent = (node: Component, context: any) => node.type(buildProps(node), context);

export default buildComponent;
