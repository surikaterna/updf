import bind from './bind';
import _render from './_render';


/** out */
const out = bind('out', (props, context) => {
  context.page.object.Contents.object.append(props.ops);
});
//console.log('OT', out('TT'));

const seq = bind('seq', (props, context) => {
  props.children.forEach(ch => _render(ch, context));
});

const stack = bind((props) =>
  seq(out({ ops: 'q' }), props.children, out({ ops: 'Q' }))
);

const box = (props) => {
  let children = props.children;
  /*  if (props.style) {
      children = style({ style: props.style }, children);
    }*/

  return stack(
    children
  );
};

export default bind(box);