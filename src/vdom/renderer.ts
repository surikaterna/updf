import buildProps from './buildProps';

function _renderer(vdom: any, context: any, hooks = { childWillRender: [], childHasRendered: [] }) {
  const props = buildProps(vdom);
  const Component = vdom.component;
  const comp = new Component(props, context);
  comp.props = props;
  comp.context = context;

  // hooks
  const hookCWRLength = hooks.childWillRender.length;
  const hookCHRLength = hooks.childHasRendered.length;

  comp.treeWillRender && comp.treeWillRender();

  // @ts-expect-error TS(2349): This expression is not callable.
  hooks.childWillRender.forEach((hook) => hook(comp, vdom));
  comp.render && comp.render();

  const preparedContext = Object.assign({}, context, comp.getChildContext ? comp.getChildContext() : {});

  // @ts-expect-error TS(2345): Argument of type '(chComponent: any, chVdom: any) ... Remove this comment to see the full error message
  comp.childWillRender && hooks.childWillRender.push((chComponent: any, chVdom: any) => comp.childWillRender(chComponent, chVdom));
  // @ts-expect-error TS(2345): Argument of type '(chComponent: any, chVdom: any) ... Remove this comment to see the full error message
  comp.childHasRendered && hooks.childHasRendered.push((chComponent: any, chVdom: any) => comp.childHasRendered(chComponent, chVdom));
  //console.log('>HKS', hooks);

  if (vdom.children && vdom.children.length > 0) {
    vdom.children.forEach((ch: any) => {
      const ctx = Object.assign({}, preparedContext, ch.context);
      _renderer(ch, ctx, hooks);
    });
  }

  // hooks (reset)
  hooks.childWillRender.length = hookCWRLength;
  hooks.childHasRendered.length = hookCHRLength;
  // @ts-expect-error TS(2349): This expression is not callable.
  hooks.childHasRendered.forEach((hook) => hook(comp, vdom));
  comp.treeHasRendered && comp.treeHasRendered();
  // console.log('<HKS', hooks);

  return preparedContext;
}

export default function renderer(vdom: any) {
  const ctx = _renderer(vdom, {});
  return ctx.document;
}
