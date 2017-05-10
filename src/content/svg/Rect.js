import bind from '../bind';
const Rect = (props, context) => {
  const { x, y, height, width } = props;
  context.context2d.rect(x, y, width, height);
};

export default bind('Rect', Rect);
