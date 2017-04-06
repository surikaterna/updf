import block from '../src/content/block';
import page from '../src/content/page';
import document from '../src/content/document';
import inline from '../src/content/inline';
import text from '../src/content/text';
import a4 from '../src/boxes/a4';
import helvetica from '../src/font/helvetica';

import reduce from '../src/vdom/reduce';
import layouter from '../src/vdom/layouter';
import renderer from '../src/vdom/renderer';

import should from 'should';

/* processes:
  * layout (x,y, width & height)
   *  width needs font (inline)
  * render
*/




function dumpDom(vdom, indent = 0) {
  let out = '';
  for (let i = 0; i < indent; i++) { out += '  '; }
  out += `<${vdom.type}`;
  Object.keys(vdom.props).forEach(key => {
    out += ` ${key}=${JSON.stringify(vdom.props[key])}`;
  });
  Object.keys(vdom.context).forEach(key => {
    if (key !== 'font' && key !== 'fonts' && key !== '_contexts') {
      out += ` $${key}=${JSON.stringify(vdom.context[key])}`;
    }
  });
  out += '>';
  console.log(out);
  if (vdom.children) {
    vdom.children.forEach(ch => {
      /*      if (isText(ch)) {
              console.log(ch.str);
            } else {*/
      dumpDom(ch, indent + 1);
      //}
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
      // skip internal keys
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
  it.only('should put absolute position', () => {

    const width = 595.28;
    const height = 841.89;
    const left = 40;
    const top = 100;
/*    
    <Document>
      <Page mediaBox={{ mediaBox: a4 }}>
        <Block style={{ fontFamily: 'Helvetica', fontSize: 12, top, left, position: 'absolute' }}>
          <Block style={{ top }}>
            <Inline>
              Hello World             2!
            </Inline>
            <Inline>Again</Inline>
          </Block>
        </Block>
      </Page>
    </Document>
*/
    const b = document({},
      page({ mediaBox: a4 },
        block({ style: { fontFamily: 'Helvetica', fontSize: 12, top, left, position: 'absolute' } },
          block({ style: { top: 100 } },
            ['Hello World              2!', 'Again']
          )
        )
      )
    );



    const ctx = {
      width,
      height,
      mediaBox: a4,
      ax: 0,
      ay: 0,
      fonts: new Fonts()
    };
    ctx.font = ctx.fonts.add('Helvetica', helvetica);
    // defaults

    const rb = reduce(b, ctx);
    layouter(rb, ctx);
    dumpDom(rb);
    const doc = renderer(rb, ctx);
    const out = [];
    try {
      doc.write((e) => {
        out.push(e);
      });
    } catch (e) {
      console.error(e);
    }
    //console.log('RES\n', out.join(''));

    //    console.log(b.context);
    //b.props.style.width.should.equal(0);
    //console.log('>>', b.children[0].children[0].context);
    b.children[0].children[0].context.ax.should.equal(left);
    b.children[0].children[0].context.ay.should.equal(top);
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
  });
});

