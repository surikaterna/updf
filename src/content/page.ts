import bind from './bind';
import border from './styles/border';
import Context2d, { OutFunc } from './vector/Context2d';

export type ChildContext = {
  page: any;
  out: OutFunc;
  context2d: Context2d;
};

class Page {
  _childContext: ChildContext;
  _context2d: Context2d;
  _out: OutFunc;
  _page: any;
  context: any;
  props: any;

  constructor(props: any, context: any) {
    this.props = props;
    this.context = context;
    const { document } = this.context;
    this._page = document.addPage(this.props);
    this._out = (ops: any) => {
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

  render(): void {
    const ctx = Object.assign({}, this.context, this._childContext);
    border(this.props, ctx);
  }

  getChildContext(): ChildContext {
    return this._childContext;
  }
}

export default bind('page', Page);
