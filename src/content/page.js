import bind from './bind';
import _render from './_render';

function buildStyle({ mediaBox }) {
  console.log('>>', mediaBox);
  return {
    top: mediaBox[0],
    left: mediaBox[1],
    right: 0,
    bottom: 0,
    $width: mediaBox[2] - mediaBox[0], // private
    $height: mediaBox[3] - mediaBox[1]
  };
}

const page = (props, context) => {
  const { doc } = context;
  const childContext = Object.assign({}, context);
  childContext.page = doc.addPage(props);
  childContext.style = buildStyle(props); // inherited style

  childContext.out = function (ops) {
    childContext.page.object.Contents.object.append(ops);
    return childContext;
  };

  console.log('CTX', childContext.style, props.children);

  props.children.forEach(ch => _render(ch, childContext));

};

export default bind('page', page);
