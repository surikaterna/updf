import bind from '../bind';

const Ellipse = (props, context) => {
  const { cx, cy, rx, ry } = props;
  context.context2d.ellipse(cx, cy, ry, rx);
};

export default bind('Circle', Ellipse);
