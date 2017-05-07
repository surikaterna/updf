import bind from '../bind';
import pathParser from './pathParser';
import Context2d from '../vector/Context2d.js';

const mapping = {
  C: 'bezierCurveTo',
  c: 'bezierCurveToR',
  M: 'moveTo',
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
  /*  m: 'moveToR',
    l: 'lienToR'*/
};

const classes = {
  st0: { fill: '#002F87' },
  st1: { fill: '#FFFFFF' },
  st2: { fill: '#E2231A' }
}

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
  const ctx = new Context2d(context.out);
  ctx.fillColor(classes[props.class || 'st0'].fill || '#ffffff');
  pathParser(props.d || '', _bridge(ctx, mapping));
  // console.log('Path', props.class);
  ctx.stroke();
  //context.out('f'); // stroke
};

export default bind('Path', Path);
