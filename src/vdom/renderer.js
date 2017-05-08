import buildProps from './buildProps';

function _renderer(vdom, context) {
  const props = buildProps(vdom);
  const Component = vdom.component;
  const comp = new Component(props, context);
  comp.props = props;
  comp.context = context;

  comp.treeWillRender && comp.treeWillRender();
  comp.render && comp.render();

  const preparedContext = Object.assign({}, context, comp.getChildContext ? comp.getChildContext() : {});

  if (vdom.children && vdom.children.length > 0) {
    vdom.children.forEach(ch => {
      const ctx = Object.assign({}, preparedContext, ch.context);
      _renderer(ch, ctx);
    });
  }
  comp.treeHasRendered && comp.treeHasRendered();
  return preparedContext;
}

export default function renderer(vdom) {
  const ctx = _renderer(vdom, {});
  return ctx.document;
}