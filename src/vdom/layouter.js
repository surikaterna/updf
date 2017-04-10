import text from '../content/text';

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
  maxWidth: (ctx, val) => ({ maxWidth: Math.min(val, ctx.maxWidth) }),
  left: (ctx, val) => ({ ax: ctx.ax + val, x: val, width: ctx.width - val }),
  top: (ctx, val) => ({ ay: ctx.ay + val, y: val }),
  width: (ctx, val) => ({ width: Math.min(val, ctx.maxWidth), maxWidth: Math.min(val, ctx.maxWidth) }),
  height: (ctx, val) => ({ height: Math.min(val, ctx.maxHeight), maxHeight: Math.min(val, ctx.maxHeight) }),
  right: (ctx, val) => ({ width: ctx.width - val, ax: val })
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
  return vdom;
}

function layoutText(width, currentX, txt, font, fontSize) {

  const result = [''];
  const spaceSize = font.width(' ', fontSize);

  let ocx = 0;
  let cx = currentX;
  let cy = 0;
  // lines are explicit line breaks....
  // split words and see what fits in the width available, and make implicit line breaks where needed
  let lines = txt.split('\n');
  lines = lines.map(line => line.split(' '));
  lines.forEach(line => {
    line.forEach(word => {
      const wordsize = font.width(word, fontSize);
      if (!cx || ((cx + wordsize + spaceSize) < width)) {
        cx += wordsize + spaceSize;
        result[result.length - 1] += word + ' ';
      } else {
        // new line
        cx = wordsize;
        cy += fontSize;
        result.push(word + ' ');
      }
    });
    ocx = cx;
    cx = 0;
    cy += fontSize;
  });
  return { cx: ocx, lines: result };
}

function position(props, context) {
  let pos = props.style.position || 'static';
  return pos;
}

function fitText(vdom, maxWidth, context, cx = 0, cy = 0) {
  const result = [];
  const layout = layoutText(maxWidth, cx, vdom.props.str, context.font, context.fontSize);
  layout.lines.forEach((line, index) => {
    console.log(index, line, cy, context.fontSize);
    const txt = text({
      str: line,
      style: {
        position: 'relative',
        left: (index === 0) ? cx : 0,
        top: cy + ((index) * context.fontSize),
        height: context.fontSize,
        width: context.font.width(line) * context.fontSize
      }
    });
    console.log(txt.props.style.top);
    txt.context = Object.assign({}, context);

    //    txt.context.ax = context.ax + txt.context.x;
    //    txt.context.y = cy + (index + 1) * context.fontSize;
    //  txt.context.ay = context.ay + txt.context.y;
    //  txt.context.height = context.fontSize;
    result.push(txt);
  });

  return result;
}


/** Travel vdom tree and calculate all size dependent properties
 *  and set them explicitly for easier render
 */
export default function layouter(vdom, context) {
  styler(vdom, context);
  vdom.context = context;
  let x = 0;
  let y = 0;
  let maxWidth = vdom.props.style.maxWidth || context.width;

  // used to align text to have the same baseline
  //  let currentLineHeight = 0;
  let nodeHeight = vdom.props.style.height || context.height || 0;
  let lineHeight = 0;
  if (vdom.children && vdom.children.length > 0) {
    for (let chIndex = 0; chIndex < vdom.children.length; chIndex++) {
      const ch = vdom.children[chIndex];
      // inline
      if (isText(ch)) {
        lineHeight = 0;
        //console.log(fitText(ch, maxWidth, context, x, y));
        const fittedText = fitText(ch, maxWidth, context, x, y);
        vdom.children.splice(chIndex, 1, ...fittedText);
        // skip already layed out children
        chIndex += fittedText.length - 1;
        fittedText.forEach(txt => {
          nodeHeight = Math.max(nodeHeight, txt.props.style.height + txt.props.style.top);
          lineHeight = Math.max(lineHeight, txt.props.style.height);
          console.log(txt.props.str, txt.props.style.top, nodeHeight);
          styler(txt, txt.context);
        });
        y += (fittedText.length - 1) * context.fontSize;
        //console.log()
        x += fittedText[fittedText.length - 1].props.style.width;
      } else {
        // block
        //      console.log('>', ch.props.style && ch.props.style.width);
        const ctx = Object.assign({}, context);// context.push();
        ctx.x = 0;
        ctx.y = y;
        ctx.ax = context.ax;
        // block = new line
        console.log('LINE HEIHG', lineHeight);
        ctx.ay = context.ay + y;
        if (!(ch.props.style && ch.props.style.position)) {
          ctx.ay += lineHeight;
        }
        layouter(ch, ctx);
        //context.pop();
        console.log('CHILD', ch.context.width, ch.context.height);
        nodeHeight = Math.max(ch.context.ay - context.ay + ch.context.height, nodeHeight);
        x += ch.context.width;
        y += !(ch.props.style && ch.props.style.position) ? ch.context.height : 0;
        if (x > maxWidth) {
          x = context.x;
        }
        //ctx.ax = vdom.ax + x;
        //ctx.ay = vdom.ay + y;
      }
    };

    vdom.context.width = maxWidth;
    console.log('HEIGHT', vdom.context.ay, vdom.context.y, y);
    vdom.context.height = nodeHeight;
    //vdom.context.x = 0;
    //vdom.context.y = 0;
  }
};