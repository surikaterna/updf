import block from '../src/content/block';
import inline from '../src/content/inline';
import should from 'should';

/* processes:
  * layout (x,y, width & height)
   *  width needs font (inline)
  * render
*/


const ss = {
  fontFamily: (ctx, val) => ({ font: ctx.fontCache.load(val) }),
  fontSize: (ctx, val) => ({ fontSize: val }) // resolve absolute / relative codes
};

function display(vdom) {
  return (vdom.style && vdom.style.display) || vdom.type;
}

function layouter(vdom, context) {
  console.log('>', vdom.type, Object.keys(vdom), vdom.children);
  vdom.props.style = vdom.props.style || {};
  const dsp = display(vdom);
  let x = 0;
  let y = 0;
  if (vdom.children && vdom.children.length > 0) {
    vdom.children.forEach(ch => {
      console.log('>', ch.props.style.width);
      const ctx = context.push();
      layouter(ch, );
      context.pop();
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

class Context {
  constructor() {
    this._contexts = [];
    this.push();
  }

  push() {
    const ctx = {};
    this._eachContextKey((k) => { ctx[k] = this[k]; });
    this._contexts.push(ctx);
  }

  _eachContextKey(fn) {
    Object.keys(this).forEach(k => {
      k !== '_contexts' && fn(k);
    });
  }

  pop() {
    const ctx = this._contexts.pop();
    // remove all current keys
    this._eachContextKey(k => delete this[k]);
    // restore previous keys
    Object.keys(ctx).forEach(k => { this[k] = ctx[k]; });
  }
}

describe('container', () => {
  it.only('should limit size of children to container', () => {
    /*const b = block({},
      block({ style: { width: 100 } },
        block({ style: { width: 120 } },
          inline({}, 'Hello World!')
        )));
        */
    const ctx = new Context();
    layouter(b, ctx);
    //dumpDom(b);
    //b.props.style.width.should.equal(0);
  });
});

describe('Context', () => {
  describe('#pop', () => {
    it('should remove any added context properties', () => {
      const context = new Context();
      context.push();
      context.test = 'Hello';
      context.pop();
      should(context.test).equal(undefined);
    });
  })
});

