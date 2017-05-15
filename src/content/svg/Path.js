import bind from '../bind';
import pathParser from './pathParser';
import _applyStyles from './_applyStyles';
import _renderOp from './_renderOp';

const mapping = {
  A: 'arcTo',
  a: 'arcToR',
  C: 'bezierCurveTo',
  c: 'bezierCurveToR',
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

const _bridge = (context) => {
  const bridge = {};
  Object.keys(mapping).forEach(key => {
    bridge[key] = (...args) => {
      if(key === 'a' || key === 'A') {
      }
      context[mapping[key]](...args);
    };
  });
  return bridge;
};

const Path = (props, context) => {
  const ctx = context.context2d;
  try {
    pathParser(props.d || '', _bridge(ctx, mapping));
/*    ctx.strokeColor('#ff0000')*/
  } catch(e) {
    console.log('PATH');
  }
};

export default bind('Path', Path);
