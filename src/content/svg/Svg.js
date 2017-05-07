import bind from '../bind';

class Svg {
  constructor(props, context) {
    // width
    // height
    // viewBox
    // create transformation matrix?
    const viewBox = props.viewBox || [0, 0, context.height, context.width];
    console.log('Viewbox: ', props.viewBox, viewBox, context.height, context.width);
    console.log('SVG: ', context.ax, context.ay);
    // move in position of DOM element
    context.context2d.translate(context.ax, context.ay);
    // calculated scale
    context.context2d.scale(.5, .5);
    // transform viewbox
    context.context2d.translate(-viewBox[0], -viewBox[1]);
    //context.context2d.transform(.5, 0, 0, .5, -viewBox[0], -viewBox[1]);
  }
  getChildContext() {
    return {
      svg: this
    };
  }
}

export default bind('svg', Svg);
