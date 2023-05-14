import text from '../content/text';

const isText = (obj: any) => typeof obj === 'string' || (obj.type && obj.type === 'text');

const dumpContext = (ctx: any) => {
  Object.keys(ctx).forEach(k => {
    if (k !== 'font') {
      console.log(k, ctx[k]);
    }
  });
};


const ss = {
  // @ts-expect-error TS(7006): Parameter 'ctx' implicitly has an 'any' type.
  fontFamily: (ctx, val) => ({
    font: ctx.fonts.get(val)
  }),
  // @ts-expect-error TS(7006): Parameter 'ctx' implicitly has an 'any' type.
  fontSize: (ctx, val) => ({
    fontSize: val
  }), // resolve absolute / relative codes
  // @ts-expect-error TS(7006): Parameter 'ctx' implicitly has an 'any' type.
  textAlign: (ctx, val) => ({
    textAlign: val
  }),
  // @ts-expect-error TS(7006): Parameter 'ctx' implicitly has an 'any' type.
  lineHeight: (ctx, val) => ({
    lineHeight: val
  })
  /*  maxWidth: (ctx, val) => ({ maxWidth: Math.min(val, ctx.maxWidth) }),
    left: (ctx, val) => ({ ax: ctx.ax + val, x: val, width: ctx.width - val }),
    top: (ctx, val) => ({ ay: ctx.ay + val, y: val }),
    width: (ctx, val) => ({ width: Math.min(val, ctx.maxWidth), maxWidth: Math.min(val, ctx.maxWidth) }),
    height: (ctx, val) => ({ height: Math.min(val, ctx.maxHeight), maxHeight: Math.min(val, ctx.maxHeight) }),
    right: (ctx, val) => ({ width: ctx.width - val, ax: val })*/
};


const getMargins = (style: any) => ({
  left: style.marginLeft || 0,
  top: style.marginTop || 0,
  right: style.marginRight || 0,
  bottom: style.marginBottom || 0
});

/**
  static   -  Default value. Elements render in order, as they appear in the document flow	Play it »
  absolute -	The element is positioned relative to its first positioned (not static) ancestor element	Play it »
  fixed	   -  The element is positioned relative to the browser window	Play it »
  relative -  The element is positioned relative to its normal position, so "left:20px" adds 20 pixels to the element's LEFT position	Play it »
  initial	 -  Sets this property to its default value. Read about initial	Play it »
  inherit	 -  Inherits this property from its parent element. Read about inherit
*/

const processors = [
  (vdom: any, context: any) => {
    // I position things
    const style = vdom.props.style;

    const maxWidth = context.maxWidth;
    const docWidth = context.mediaBox[2];
    let width = style.width || maxWidth;

    const maxHeight = context.maxHeight;
    const docHeight = context.mediaBox[3];
    let height = style.height || maxHeight;

    const position = style.position || 'static';
    const margins = getMargins(style || {});
    if (position === 'fixed') {
      const { top, bottom, left, right } = style;
      if (left && right) {
        width = docWidth - (right + left);
      }
      if (top && bottom) {
        height = docHeight + (bottom + top);
      }
      const ax = left || docWidth - width;
      const ay = top || 0;
      //console.log('POS', width, height, ax, ay, right, left, docWidth)
      context.ax = ax;
      context.ay = ay;
      context.width = width;
      context.height = height;
    } else if (position === 'relative') {
      context.ax = (context.ax || 0) + (style.left || 0);
      context.ay = (context.ay || 0) + (style.top || 0);
    } else if (position === 'absolute') {
      context.ax = context.ancX + (style.left || 0);
      context.ay = context.ancY + (style.top || 0);
      context.width = width;
      context.height = height;
    } else {

    }
    //console.log('PPP', position);
    if (margins.left || margins.right) {
      context.ax += margins.left;
      context.width -= margins.right + margins.left;
    };
    if (margins.top || margins.bottom) {
      context.ay += margins.top;
      context.height += margins.bottom + margins.top;
    };
    if (position !== 'static') {
      context.ancX = context.ax;
      context.ancY = context.ay;
    }
  }
  //console.log(style, context.ax, context.ay, context.width, context.height);
];

function display(vdom: any) {
  return (vdom.style && vdom.style.display) || vdom.type;
}

function styleProp(props: any, values: any) {
  props.style = Object.assign(props.style || {}, values);
  return props.style;
}

function styler(vdom: any, context: any) {
  // context.css vs vdom.props.style
  // call style setters
  // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
  const stil = styleProp(vdom.props);
  processors.forEach(p => {
    p(vdom, context);
  })
  Object.keys(stil).forEach(key => {
    // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    if (ss[key]) {
      // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      const newPart = ss[key](context, stil[key]);
      //  console.log(newPart);
      Object.assign(context, newPart);
      //    console.log('>ä', vdom.type);
      //      dumpContext(context);
    }
  });
  return vdom;
}

function layoutText(width: any, currentX: any, txt: any, font: any, fontSize: any) {

  const result = [''];
  const spaceSize = font.width(' ', fontSize);

  let ocx = 0;
  let cx = currentX;
  let cy = 0;
  // lines are explicit line breaks....
  // split words and see what fits in the width available, and make implicit line breaks where needed
  let lines = txt.split('\n');
  lines = lines.map((line: any) => line.split(' '));

  lines.forEach((line: any) => {
    line.forEach((word: any) => {
      const wordsize = font.width(word, fontSize);

      if (!cx || ((cx + wordsize + spaceSize) < width)) {
        cx += wordsize + spaceSize;
        result[result.length - 1] += word + ' ';
      } else {
        // new line
        cx = wordsize;
        const extraSpace = font.width(' - ', fontSize);

        // Split word if it is still to long for new line
        if ((cx + extraSpace) > width) {
          cx += extraSpace;
          const iterations = Math.ceil(wordsize / width);
          const percentage = (Math.floor(((width - extraSpace) / wordsize) * 100)) / 100;
          const charsPerLine = Math.floor(word.length * percentage);

          const subStrings = [];
          let startIndex = 0;

          for (let i = 1; i <= iterations; i += 1) {
            // @ts-expect-error TS(2339): Property 'length' does not exist on type 'number'.
            if (i === iterations.length) {
              subStrings.push(word.substring(startIndex));
              return; // Continue
            }
            subStrings.push(word.substr(startIndex, charsPerLine));
            startIndex += charsPerLine;
          }

          subStrings.forEach((subString, index) => {
            cx = font.width(subString, fontSize) + extraSpace;
            cy += fontSize;
            let str = ' ' + subString;
            if (index !== subStrings.length - 1) {
              str += '-';
            }
            result.push(str + ' ');
          });

          return; // Continue
        }

        cy += fontSize;
        result.push(word + ' ');
      }
    });

    ocx = cx;
    cx = width;
    cy += fontSize;
  });

  return { cx: ocx, lines: result };
}

function position(props: any, context: any) {
  let pos = props.style.position || 'static';
  return pos;
}

function fitText(vdom: any, maxWidth: any, context: any, cx = 0, cy = 0) {
  const result: any = [];
  const layout = layoutText(maxWidth, cx, vdom.props.str, context.font, context.fontSize);

  layout.lines.forEach((line, index) => {
    let x = (index === 0) ? cx : 0;
    if (context.textAlign) {
      if (context.textAlign === 'right') {
        x += maxWidth - context.font.width(line, context.fontSize);
      } else if (context.textAlign === 'center') {
        x += (maxWidth / 2 - context.font.width(line, context.fontSize) / 2);
      }
    }
    const y = cy + ((index) * context.fontSize * context.lineHeight);
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    const txt = text({
      str: line,
      style: {
        position: 'relative',
        left: x,
        top: y + context.lineHeight,
        height: context.fontSize * context.lineHeight,
        width: context.font.width(line) * context.fontSize
      }
    });
    // @ts-expect-error TS(2339): Property 'context' does not exist on type '{ type:... Remove this comment to see the full error message
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
export default function layouter(vdom: any, context: any) {
  styler(vdom, context);
  vdom.context = context;
  let x = 0;
  let y = 0;
  let maxWidth = vdom.props.style.maxWidth || context.width;

  // used to align text to have the same baseline
  //  let currentLineHeight = 0;
  let maxHeight = context.height;
  let nodeHeight = vdom.props.style.height || 0;
  if (vdom.props.style.position && vdom.props.style.position === 'fixed') {
    nodeHeight = 0;
  }
  let lineHeight = 0;
  if (vdom.children && vdom.children.length > 0) {
    if (vdom.type !== 'svg') {
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
          // @ts-expect-error TS(7006): Parameter 'txt' implicitly has an 'any' type.
          fittedText.forEach(txt => {
            nodeHeight = Math.max(nodeHeight, txt.props.style.height + txt.props.style.top);
            lineHeight = Math.max(lineHeight, txt.props.style.height);
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
          //console.log('LINE HEIHG', lineHeight);
          ctx.ay = context.ay + y;
          /*          if (!(ch.props.style && ch.props.style.position)) {
                      ctx.ay += lineHeight;
                    }
          */
          layouter(ch, ctx);
          //context.pop();
          //console.log('CHILD', ch.context.width, ch.context.height, nodeHeight);

          nodeHeight = Math.max(ch.context.ay - context.ay + ch.context.height, nodeHeight);
          if(ch.props.style) {
            if(ch.props.style.position !== 'absolute' && ch.props.style.position !== 'fixed') {
              x += ch.context.width;
              y += ch.context.height;
            }
          }
           
          if (x > maxWidth) {
            x = context.x;
          }
          x=0;
          //ctx.ax = vdom.ax + x;
          //ctx.ay = vdom.ay + y;
        }
      };
    }
    vdom.context.width = maxWidth || 100;
    //console.log('HEIGHT', vdom.type, nodeHeight);

    vdom.context.height = nodeHeight || 100;
//    console.log('> > LY', vdom.type, vdom.props.id || '', vdom.context.ax, vdom.context.ay, vdom.context.width, vdom.context.height);
    //vdom.context.x = 0;
    //vdom.context.y = 0;
  }
};