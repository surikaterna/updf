import bind from '../bind';
import pathParser from './pathParser';

const mapping = {
  A: 'arcTo',
  a: 'arcToR',
  C: 'bezierCurveTo',
  c: 'bezierCurveToR',
  q: 'quadraticCurveToR',
  Q: 'quadraticCurveTo',
  M: 'moveTo',
  m: 'moveToR',
  L: 'lineTo',
  l: 'lineToR',
  H: 'hLineTo',
  h: 'hLineToR',
  V: 'vLineTo',
  v: 'vLineToR',
  S: 'smoothCurveTo',
  s: 'smoothCurveToR',
  Z: 'close',
  z: 'close'
};

const _bridge = (context: any) => {
  const bridge = {};
  Object.keys(mapping).forEach(key => {
    // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    bridge[key] = (...args: any[]) => {
      if (key === 'a' || key === 'A') {
      }
      // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      context[mapping[key]](...args);
    };
  });
  return bridge;
};

const Path = (props: any, context: any) => {
  const ctx = context.context2d;
  try {
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 2.
    pathParser(props.d || '', _bridge(ctx, mapping));
/*    ctx.strokeColor('#ff0000')*/
  } catch (e) {
    console.log('PATH');
  }
};

export default bind('Path', Path);
