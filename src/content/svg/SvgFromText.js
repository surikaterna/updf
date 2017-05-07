import bind from '../bind';
import parseXml from '../util/parseXml';
import transform from '../util/transform';


import svg from './Svg';
import style from './Style';
import path from './Path';
import polygon from './Polygon';
import g from './Group';

const map = {
  svg, path, style, polygon, g
};

const SvgFromText = (props) => {
  const svgText = props.svg;
  const svg = parseXml(svgText);
  if (svg.type !== 'svg') {
    throw new Error('wrong type ' + svg.type);
  }
  return transform(svg, map);
};

export default bind(SvgFromText);
