import bind from '../bind';
import _applyStyles from './_applyStyles';
import _renderOp from './_renderOp';
const Rect = (props, context) => {
  const { x, y, height, width } = props;
  console.log('RECT', props);
  const style = context.css.computeStyles({ props }, context.css);
  _applyStyles(context.context2d, style);  
  context.context2d.rect(x, y, width, height);
  _renderOp(context.context2d, style);  
  
};

export default bind('Rect', Rect);
