import bind from './bind';
import _render from './_render';
import border from './styles/border';

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
    this._childContext = {
      page: this._page,
      out: this._out
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
