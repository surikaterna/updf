const styler = {
  fill: (ctx, val) => ctx.fillColor(val),
  stroke: (ctx, val) => ctx.strokeColor(val)
};

const _applyStyles = (ctx, style) => {
  Object.keys(style).forEach(key => {
    const styleApply = styler[key];
    if (styleApply) {
      styleApply(ctx, style[key], style);
    } else {
      //console.log('Unsupported', key);
    }
  });
};

export default _applyStyles;
