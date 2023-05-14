import { collect, collectArguments } from './pathParser';

const styler = {
  fill: (ctx: any, val: any) => ctx.fillColor(val),
  stroke: (ctx: any, val: any) => ctx.strokeColor(val)
};

const transformer = {
  matrix: (ctx: any, args: any) => ctx.transform(...args),
  translate: (ctx: any, args: any) => ctx.translate(...args)
};

const _applyStyles = (ctx: any, style: any, props: any) => {
  if (props.transform) {
    collect(props.transform, /\b([^()]+)\(([^)]*)\)/g).forEach((opDef) => {
      const op = opDef[1];
      const args = collectArguments(opDef[2]);
      // @ts-expect-error FIXME
      const transApply: any = transformer[op];
      if (transApply) {
        transApply(ctx, args);
      } else {
        console.log('Unsupported Trans', op);
      }
    });
  }

  Object.keys(style).forEach((key) => {
    // @ts-expect-error FIXME
    const styleApply = styler[key];
    if (styleApply) {
      styleApply(ctx, style[key], style);
    }
  });
};

export default _applyStyles;
