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
  }
};

export default _renderOp;
