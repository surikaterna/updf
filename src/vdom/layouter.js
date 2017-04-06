
const isText = (obj) => typeof obj === 'string' || (obj.type && obj.type === 'text');

const dumpContext = (ctx) => {
  Object.keys(ctx).forEach(k => {
    if (k !== 'font') {
      console.log(k, ctx[k]);
    }
  });
};


const ss = {
  fontFamily: (ctx, val) => ({ font: ctx.fonts.get(val) }),
  fontSize: (ctx, val) => ({ fontSize: val }), // resolve absolute / relative codes
  maxWidth: (ctx, val) => ({ maxWidth: val }),
  left: (ctx, val) => ({ ax: ctx.ax + val, x: val }),
  top: (ctx, val) => ({ ay: ctx.ay + val, y: val, py: ctx.mediaBox[3] - (ctx.ay + val) })
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
      const newPart = ss[key](context, stil[key]);
    //  console.log(newPart);
      Object.assign(context, newPart);
  //    console.log('>ä', vdom.type);
//      dumpContext(context);
    }
  });
}

function layoutText(width, currentX, tt, font, fontSize) {
  const txt = tt.props.str;
  const result = [''];
  const spaceSize = font.width(' ', fontSize);

  let cx = currentX;
  let cy = 0;
  // lines are explicit line breaks....
  // split words and see what fits in the width available, and make implicit line breaks where needed
  let lines = txt.split('\n');
  lines = lines.map(line => line.split(' '));
  console.log('SPL', txt.split(/(\s+)/));
  lines.forEach(line => {
    line.forEach(word => {
      const wordsize = font.width(word, fontSize);
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
  return { cx, lines: result };
}

function position(props, context) {
  let pos = props.style.position || 'static';
  return pos;
}


/** Travel vdom tree and calculate all size dependent properties
 *  and set them explicitly for easier render
 */
export default function layouter(vdom, context) {
  styler(vdom, context);
  vdom.context = context;
  let x = context.ax;
  let y = context.ay;
  let maxWidth = vdom.props.style.maxWidth || context.width;

  // used to align text to have the same baseline
  //  let currentLineHeight = 0;

  if (vdom.children && vdom.children.length > 0) {
    vdom.children.forEach(ch => {
      if (isText(ch)) {
        const width = vdom.props.style.width || context.maxWidth;
        // console.log('!!!!');
        dumpContext(context);
        ch.context = Object.assign({}, context);
        ch.context.ax = x;
        ch.context.ay = y;
        styler(ch, ch.context);
        dumpContext(ch.context);
        const res = layoutText(width, x, ch, context.font, context.fontSize);
        // console.log('TXT', res);
        x += context.font.width(ch.props.str)*ch.context.fontSize;
        y += res.lines.length * context.fontSize;
        console.log('>>', x, y, res.lines.length);
        //context.pop();
        //dumpContext(ch.context);
      } else {
        //      console.log('>', ch.props.style && ch.props.style.width);
        const ctx = Object.assign({}, context);// context.push();
        ctx.x = x;
        ctx.y = y;
        layouter(ch, ctx);
        //context.pop();
        x += ch.context.width;
        y += ch.context.height;
        if (x > maxWidth) {
          x = context.x;
        }
        //ctx.ax = vdom.ax + x;
        //ctx.ay = vdom.ay + y;
      }
    });

    vdom.context.width = maxWidth;
    vdom.context.height = y;
    vdom.context.x = 0;
    vdom.context.y = 0;
  }
};