import bind from '../bind';
import _applyStyles from './_applyStyles';
import _renderOp from './_renderOp';
const Line = (props, context) => {
  const { x1, y1, x2, y2 } = props;
  const style = context.css.computeStyles({ props }, context.css);
  _applyStyles(context.context2d, style);  
  context.context2d.moveTo(x1, y1).lineTo(x2, y2);
  _renderOp(context.context2d, style);  
};

export default bind('Line', Line);
