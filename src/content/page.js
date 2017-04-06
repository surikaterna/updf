import bind from './bind';
import _render from './_render';

function buildStyle({ mediaBox }) {
  console.log('>>', mediaBox);
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
  getChildContext() {
    console.log('Page');
    const { document } = this.context;
    const childContext = {
      page: document.addPage(this.props),
      out: ops => {
        console.log('OUT >>', ops);
        childContext.page.object.Contents.object.append(ops);
        return childContext;
      }
    };
    return childContext;
  }
};

export default bind('page', Page);
