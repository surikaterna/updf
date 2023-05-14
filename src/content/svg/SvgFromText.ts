import bind from '../bind';
import svgFactory from './svgFactory';

const SvgFromText = (props) => {
  const svgText = props.svg;
  return svgFactory(svgText, props.style);
};

export default bind(SvgFromText);
