import bind from '../bind';
import svgFactory from './svgFactory';

const SvgFromText = (props: any) => {
  const svgText = props.svg;
  return svgFactory(svgText, props.style);
};

// @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
export default bind(SvgFromText);
