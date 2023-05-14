import bind from './bind';
import _render from './_render';


/** out */
const out = bind('out', (props: any, context: any) => {
  context.page.object.Contents.object.append(props.ops);
});
//console.log('OT', out('TT'));

const seq = bind('seq', (props: any, context: any) => {
  props.children.forEach((ch: any) => _render(ch, context));
});

// @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
const stack = bind((props: any) => seq(out({ ops: 'q' }), props.children, out({ ops: 'Q' }))
);

const box = (props: any) => {
  let children = props.children;
  /*  if (props.style) {
      children = style({ style: props.style }, children);
    }*/

  // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
  return stack(
    children
  );
};

// @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
export default bind(box);