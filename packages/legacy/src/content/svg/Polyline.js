import bind from '../bind';
import { collectArguments } from './pathParser';
const Polyline = (props, context) => {
  const { points } = props;
  const pts = collectArguments(points);
  
  context.context2d.polyline(pts);
};

export default bind('Polyline', Polyline);
