import parseXml from '../util/parseXml';
import transform from '../util/transform';
import svg from './Svg';
import style from './Style';
import path from './Path';
import polygon from './Polygon';
import g from './Group';
import line from './Line';
import circle from './Circle';
import rect from './Rect';
import polyline from './Polyline';
import ellipse from './Ellipse';

const map = {
  svg,
  path,
  style,
  polygon,
  g,
  line,
  circle,
  rect,
  polyline,
  ellipse,
  title: g,
  defs: g
};

export default function svgFactory(svgText: any, styled?: any) {
  const svgNode = parseXml(svgText);
  // @ts-expect-error TS(2339): Property 'type' does not exist on type '{}'.
  if (svgNode.type !== 'svg') {
    // @ts-expect-error TS(2339): Property 'type' does not exist on type '{}'.
    throw new Error('wrong type ' + svgNode.type);
  }
  return transform(svgNode, map, { style: styled || {} });
}
