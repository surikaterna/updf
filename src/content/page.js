import bind from './bind';
import _render from './_render';
import border from './styles/border';
import Context2d from './vector/Context2d';

function buildStyle({ mediaBox }) {
  return {
    top: mediaBox[0],
    left: mediaBox[1],
    right: 0,
    bottom: 0,
    width: mediaBox[2] - mediaBox[0], // private
    height: mediaBox[3] - mediaBox[1]
  };
}

class Page {
  constructor(props, context) {
    this.props = props;
    this.context = context;
    const { document } = this.context;
    this._page = document.addPage(this.props);
    this._out = ops => {
      this._page.object.Contents.object.append(`${ops}\n`);
    };
    this._context2d = new Context2d(this._out);
    const height = this.props.mediaBox[3] - this.props.mediaBox[1];
    this._context2d.transform(1, 0, 0, -1, 0, height);
    this._childContext = {
      page: this._page,
      out: this._out,
      context2d: this._context2d
    };
  }
  render() {
    const ctx = Object.assign({}, this.context, this._childContext);
    border(this.props, ctx);
  }
  getChildContext() {
    return this._childContext;
  }
}

export default bind('page', Page);
