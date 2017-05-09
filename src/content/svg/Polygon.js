import bind from '../bind';
import { collectArguments } from './pathParser';

import _applyStyles from './_applyStyles';
import _renderOp from './_renderOp';

const Polygon = (props, context) => {
  const { points } = props;
  const pts = collectArguments(points);
  
  const style = context.css.computeStyles({ props }, context.css);
  _applyStyles(context.context2d, style);

  context.context2d.polyline(pts);
  _renderOp(context.context2d, style);
};

export default bind('Polygon', Polygon);
