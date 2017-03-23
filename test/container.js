import block from '../src/content/block';
import inline from '../src/content/inline';
import text from '../src/content/text';

import helvetica from '../src/font/helvetica';

import should from 'should';

/* processes:
  * layout (x,y, width & height)
   *  width needs font (inline)
  * render
*/

const isText = (obj) => typeof obj === 'string';


const ss = {
  fontFamily: (ctx, val) => ({ font: ctx.fonts.get(val) }),
  fontSize: (ctx, val) => ({ fontSize: val }), // resolve absolute / relative codes
  maxWidth: (ctx, val) => ({ maxWidth: val })
};

function display(vdom) {
  return (vdom.style && vdom.style.display) || vdom.type;
}

function style(props, values) {
  props.style = Object.assign(props.style || {}, values);
  return props.style;
}

function styler(vdom, context) {
  // context.css vs vdom.props.style
  // call style setters
  const stil = style(vdom.props);
  Object.keys(stil).forEach(key => {
    if (ss[key]) {
      Object.assign(context, ss[key](context, stil[key]));
    }
  });
}

function layoutText(width, currentX, txt, font, fontSize) {
  // result will contain an array of layouted lines
  const result = [''];
  // divide into lines of words
  let lines = txt.split('\n');
  lines = lines.map(line => line.split(' '));

  const spaceSize = font.width(' ', fontSize);

  let cx = currentX;
  let cy = 0;

  lines.forEach(line => {
    line.forEach(word => {
      const wordsize = font.width(word, fontSize);
      console.log('WZ', wordsize);
      if (!cx || (wordsize + spaceSize < width)) {
        cx += wordsize + spaceSize;
        result[result.length - 1] += word + ' ';
      } else {
        // new line
        cx = wordsize;
        cy += fontSize;
        result.push(word + ' ');
      }
    });
    cx = 0;
    cy += fontSize;
  });
  console.log('RES ', result);
  return { cx, lines: result };
}


/** Travel vdom tree and calculate all size dependent properties
 *  and set them explicitly for easier render
 */
function layouter(vdom, context) {
  //style(vdom.props); //.style = vdom.props.style || {};
  styler(vdom, context);
  console.log('>', vdom.type, Object.keys(vdom), vdom.children, Object.keys(context));
  let x = 0;
  let y = 0;
  let currentLineHeight = 0;
  if (vdom.children && vdom.children.length > 0) {
    vdom.children.forEach(ch => {
      if (isText(ch)) {
        const width = vdom.props.style.width || context.maxWidth;
        const res = layoutText(width, x, ch, context.font, context.fontSize);
        x = res.cx;
        y += res.lines.length * context.fontSize;
      } else {
        console.log('>', ch.props.style && ch.props.style.width);
        const ctx = context.push();
        layouter(ch, ctx);
        context.pop();
        console.log('<', ch.props.style.width);
        /*        const dsp = display(ch);
                if (dsp === 'block') {
                  x = 0;
                  y += currentLineHeight; // change to a new line
                } else {
                  currentLineHeight = Math.max(ch.props.height, currentLineHeight);
                  //ch.props.style
                }
                // layouter(ch);
                // consider position attribute
                y += ch.props.style.height || 0;
                console.log(x, y);
        */

      }
    });
    vdom.props.style.width |= context.maxWidth;
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
      if (isText(ch)) {
        console.log(ch);
      } else {
        dumpDom(ch, indent + 1);
      }
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
    return this;
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

class Fonts {
  constructor() {
    this._fonts = {};
  }
  add(family, font) {
    this._fonts[family] = font;
    return font;
  }
  get(family) {
    return this._fonts[family];
  }
}

describe('container', () => {
  it.only('should limit size of children to container', () => {

    const b = block({ style: { fontFamily: 'Helvetica', fontSize: 12, maxWidth: 30 } }, block({},
      'Hello World!'
    ));
    const ctx = new Context();
    // defaults
    ctx.fonts = new Fonts();
    ctx.font = ctx.fonts.add('Helvetica', helvetica);
    layouter(b, ctx);
    dumpDom(b);
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

