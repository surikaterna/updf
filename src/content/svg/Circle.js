import bind from '../bind';
const Circle = (props, context) => {
  const { cx, cy, r } = props;
  context.context2d.ellipse(cx, cy, r);
};

export default bind('Circle', Circle);
