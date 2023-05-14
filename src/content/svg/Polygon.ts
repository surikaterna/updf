import bind from '../bind';
import { collectArguments } from './pathParser';

const Polygon = (props, context) => {
  const { points } = props;
  const pts = collectArguments(points);
  
  context.context2d.polyline(pts);
};

export default bind('Polygon', Polygon);
