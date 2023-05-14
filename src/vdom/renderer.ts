import buildProps from './buildProps';

function _renderer(vdom, context, hooks = { childWillRender: [], childHasRendered: [] }) {
  const props = buildProps(vdom);
  const Component = vdom.component;
  const comp = new Component(props, context);
  comp.props = props;
  comp.context = context;

  // hooks 
  const hookCWRLength = hooks.childWillRender.length;
  const hookCHRLength = hooks.childHasRendered.length;


  comp.treeWillRender && comp.treeWillRender();

  hooks.childWillRender.forEach(hook => hook(comp, vdom));
  comp.render && comp.render();

  const preparedContext = Object.assign({}, context, comp.getChildContext ? comp.getChildContext() : {});

  comp.childWillRender && hooks.childWillRender.push((chComponent, chVdom) => comp.childWillRender(chComponent, chVdom));
  comp.childHasRendered && hooks.childHasRendered.push((chComponent, chVdom) => comp.childHasRendered(chComponent, chVdom));
  //console.log('>HKS', hooks);


  if (vdom.children && vdom.children.length > 0) {
    vdom.children.forEach(ch => {
      const ctx = Object.assign({}, preparedContext, ch.context);
      _renderer(ch, ctx, hooks);
    });
  }

  // hooks (reset)
  hooks.childWillRender.length = hookCWRLength;
  hooks.childHasRendered.length = hookCHRLength;
  hooks.childHasRendered.forEach(hook => hook(comp, vdom));
  comp.treeHasRendered && comp.treeHasRendered();
  // console.log('<HKS', hooks);

  return preparedContext;
}

export default function renderer(vdom) {
  const ctx = _renderer(vdom, {});
  return ctx.document;
}