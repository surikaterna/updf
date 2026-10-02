import bind from '../bind';
const Line = (props, context) => {
  const { x1, y1, x2, y2 } = props;
  context.context2d.moveTo(x1, y1).lineTo(x2, y2);
};

export default bind('Line', Line);
