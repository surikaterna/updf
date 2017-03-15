import block from '../src/content/block';
import inline from '../src/content/inline';
import should from 'should';

function display(vdom) {
  return (vdom.style && vdom.style.display) || vdom.type;
}

function style(props, values) {
  props.style = Object.assign(props.style || {}, values);
  return props.style;
}

function layouter(vdom) {
  console.log('>', vdom.type, Object.keys(vdom), vdom.children);
  style(vdom.props); //.style = vdom.props.style || {};
  let x = 0;
  let y = 0;
  let currentLineHeight = 0;
  if (vdom.children && vdom.children.length > 0) {
    vdom.children.forEach(ch => {
      const dsp = display(ch);
      if (dsp === 'block') {
        x = 0;
        y += currentLineHeight; // change to a new line
      } else {
        //currentLineHeight = Math.max(ch.props.height, currentLineHeight);
        //ch.props.style
      }
      layouter(ch);
      // consider position attribute
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
      block({ style: { top: 100, left: 40, width: 100 } },
        block({ style: { width: 120 } },
          inline({}, 'Hello World!')
        )
      )
    );
    layouter(b);
    dumpDom(b);
    b.props.style.width.should.equal(0);
  });
});

