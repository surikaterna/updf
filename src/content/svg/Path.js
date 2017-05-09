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
  const style = context.css.computeStyles({ props }, context.css);
  //console.log('CSS', style, context.css._rules);
  _applyStyles(ctx, style);
  //ctx.fillColor(classes[props.class || 'st0'] && classes[props.class || 'st0'].fill || '#ff0000');
  pathParser(props.d || '', _bridge(ctx, mapping));
  // console.log('Path', props.class);
  _renderOp(ctx, style);
  //ctx.fill();
  //context.out('f'); // stroke
};

export default bind('Path', Path);
