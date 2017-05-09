import bind from '../bind';
import _applyStyles from './_applyStyles';
import _renderOp from './_renderOp';
const Circle = (props, context) => {
  const { cx, cy, r } = props;
  const style = context.css.computeStyles({ props }, context.css);
  _applyStyles(context.context2d, style);  
  context.context2d.ellipse(cx, cy, r);
  _renderOp(context.context2d, style);  
};

export default bind('Circle', Circle);
