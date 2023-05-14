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
  svg, path, style, polygon, g, line, circle, rect, polyline, ellipse, title: g, defs: g
};

export default function svgFactory(svgText, styled) {
  const svgNode = parseXml(svgText);
  if (svgNode.type !== 'svg') {
    throw new Error('wrong type ' + svgNode.type);
  }
  return transform(svgNode, map, { style: styled || {} });
};
