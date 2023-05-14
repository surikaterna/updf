import bind from '../bind';
import Css from '../styles/Css';
import _applyStyles from './_applyStyles';
import _renderOp from './_renderOp';

class Svg {
  context: any;
  props: any;
  render() {
    const context = this.context;
    const props = this.props;
    context.out('% == SVG');

    let viewBox = props.viewBox || [0, 0, context.height, context.width];
    if (typeof viewBox === 'string') {
      viewBox = viewBox.split(' ').map((e) => parseFloat(e));
    }
    const width = Number(props.width) || viewBox[2];
    const height = Number(props.height) || viewBox[3];
    const maxWidth = Number(props.style.maxWidth);
    const maxHeight = Number(props.style.maxHeight);

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

    if (maxWidth && width > maxWidth) {
      xScale = maxWidth / width;
    }

    if (maxHeight && height > maxHeight) {
      yScale = maxHeight / height;
    }

    if (yScale !== xScale) {
      // @ts-expect-error TS(2531): Object is possibly 'null'.
      if (xScale && yScale > xScale) {
        yScale = xScale;
      } else if (yScale) {
        xScale = yScale;
      }
    }

    // calculated scale
    context.context2d.scale(xScale || yScale, yScale || xScale);
    // transform viewbox
    context.context2d.translate(-viewBox[0], -viewBox[1]);

    // default style
    context.styles = Object.assign({}, { fill: 'none', stroke: '#000' }, props.style || {});
  }

  childWillRender(child: any) {
    this.context.context2d.save();
    // calc css
    child.context._styles = this.context.styles;
    this.context.styles = Object.assign({}, this.context.styles, child.context.css.computeStyles(child, this.context.css));
  }

  childHasRendered(child: any) {
    _applyStyles(this.context.context2d, this.context.styles || {}, child.props);
    _renderOp(this.context.context2d, this.context.styles || {});
    this.context.styles = child.context._styles;
    this.context.context2d.restore();
  }

  treeWillRender() {
    this.context.context2d.save();
  }

  treeHasRendered() {
    this.context.context2d.restore();
  }

  getChildContext() {
    return {
      svg: this,
      css: new Css()
    };
  }
}

export default bind('svg', Svg);
