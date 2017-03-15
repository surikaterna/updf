import block from '../src/content/block';
import inline from '../src/content/inline';
import should from 'should';

function display(vdom) {
  return (vdom.style && vdom.style.display) || vdom.type;
}

function layouter(vdom) {
  console.log('>', vdom.type, Object.keys(vdom), vdom.children);
  vdom.props.style = vdom.props.style || {};
  const dsp = display(vdom);
  let x = 0;
  let y = 0;
  if (vdom.children && vdom.children.length > 0) {
    vdom.children.forEach(ch => {
      console.log('>', ch.props.style.width);
      layouter(ch);
      console.log('<', ch.props.style.width);
      // consider position attribute
      if (dsp === 'inline') {
        x = Math.max(x, ch.props.style.width);
      }
      y += ch.props.style.height || 0;
      console.log(x, y);
    });
    vdom.props.style.width = x;
    vdom.props.style.height = y;
  }
};

function dumpDom(vdom, indent = 0) {
  let out = '';
  for (let i = 0; i < indent; i++) { out += '  '; }
  out += `<${vdom.type}`;
  Object.keys(vdom.props).forEach(key => {
    out += ` ${key}=${JSON.stringify(vdom.props[key])}`;
  });
  out += '>';
  console.log(out);
  if (vdom.children) {
    vdom.children.forEach(ch => {
      dumpDom(ch, indent + 1);
    });
  }
  out = '';
  for (let i = 0; i < indent; i++) { out += '  '; }

  console.log(`${out}</${vdom.type}>`);
}


describe('container', () => {
  it.only('should limit size of children to container', () => {
    const b = block({},
      block({ style: { width: 100 } },
        block({ style: { width: 120 } },
          inline({}, 'Hello World!')
        )));
    layouter(b);
    dumpDom(b);
    b.props.style.width.should.equal(0);
  });
});

