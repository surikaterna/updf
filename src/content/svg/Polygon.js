import bind from '../bind';
import { collectArguments } from './pathParser';

const Polygon = (props, context) => {
  const { points } = props;
  const pts = collectArguments(points);
  console.log('poly', pts);
  context.context2d.polyline(pts);
  context.context2d.fillAndStroke();
};

export default bind('Polygon', Polygon);
