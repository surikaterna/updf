const F = 'fill';
const S = 'stroke';

const _renderOp = (ctx, style) => {
  const shouldFill = style[F] && style[F] !== 'none';
  const shouldStroke = style[S] && style[S] !== 'none';
  if (shouldFill && shouldStroke) {
    ctx.fillAndStroke();
  } else if (shouldFill) {
    ctx.fill();
  } else if (shouldStroke) {
    ctx.stroke();
  } else {
    // do not draw and throw away pending operations on context
    ctx.clear();
  }
};

export default _renderOp;
