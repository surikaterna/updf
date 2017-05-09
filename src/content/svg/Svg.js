import bind from '../bind';
import Css from '../styles/Css';

class Svg {
  render() {
    const context = this.context;
    const props = this.props;
    context.out('% == SVG')
    // width
    // height
    // viewBox
    // create transformation matrix?
    let viewBox = props.viewBox || [0, 0, context.height, context.width];
    if (typeof viewBox === 'string') {
      viewBox = viewBox.split(' ').map(e => parseFloat(e));
    }
    console.log('Viewbox: ', props.viewBox, viewBox, context.height, context.width, props.height, props.width);
    console.log('SVG: ', context.ax, context.ay, props.style.height, props.style);
    const width = props.width || viewBox[2];
    const height = props.height || viewBox[3];
    // move in position of DOM element
    context.context2d.translate(context.ax, context.ay);
    let yScale = null;
    let xScale = null;
    if (props.style.height && height) {
      yScale = props.style.height / height;
    } else if (props.style.width && width) {
      xScale = props.style.width / width;
    } else {
      yScale = 1;
    }
    console.log('SCALE', xScale, yScale);
    // calculated scale
    context.context2d.scale(xScale || yScale, yScale || xScale);
    // transform viewbox
    context.context2d.translate(-viewBox[0], -viewBox[1]);
    //context.context2d.transform(.5, 0, 0, .5, -viewBox[0], -viewBox[1]);    
  }
  treeWillRender() {
    console.log('>TREE')
    this.context.out('%>TREE')
    this.context.context2d.save();
  }
  treeHasRendered() {
    this.context.context2d.restore();
    this.context.out('%<TREE')
    console.log('<TREE')
  }

  getChildContext() {
    return {
      svg: this,
      css: new Css()
    };
  }
}

export default bind('svg', Svg);
