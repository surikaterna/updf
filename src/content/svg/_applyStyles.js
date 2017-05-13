import { collect, collectArguments } from './pathParser';

const styler = {
  fill: (ctx, val) => ctx.fillColor(val),
  stroke: (ctx, val) => ctx.strokeColor(val)
};

const transformer = {
  matrix: (ctx, args) => ctx.transform(...args),
  translate: (ctx, args) => ctx.translate(...args)
};

const _applyStyles = (ctx, style, props) => {
  if(props.style) {
    console.log('GOT STYLE');
  }
  if (props.transform) {
    collect(props.transform, /\b([^()]+)\(([^)]*)\)/g).forEach(opDef => {
      const op = opDef[1];
      const args = collectArguments(opDef[2]);
      const transApply = transformer[op];
      if (transApply) {
        transApply(ctx, args);
      } else {
        console.log('Unsupported Trans', op);
      }
    });
  }

  Object.keys(style).forEach(key => {
    const styleApply = styler[key];
    if (styleApply) {
      console.log('apply stle', style);
      styleApply(ctx, style[key], style);
    } else {
//      console.log('Unsupported', key);
    }
  });
};

export default _applyStyles;
