import bind from '../bind';
import pathParser from './pathParser';
import _applyStyles from './_applyStyles';
import _renderOp from './_renderOp';

const mapping = {
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
      context[mapping[key]](...args);
    };
  });
  return bridge;
};

const Path = (props, context) => {
  const ctx = context.context2d;
  pathParser(props.d || '', _bridge(ctx, mapping));
};

export default bind('Path', Path);
