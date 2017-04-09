import bind from '../bind';

const rect = (props, context) => {
  const { out } = context;
  // out('q');
  console.log('RECT', props, context.ax, context.ay, context.width, context.height, context.mediaBox);
  out(`0.9 0.5 0.0 rg ${context.ax} ${(context.mediaBox[3] - context.ay)} ${context.width} ${-context.height} re f`);
  //out('0 0 m 100 500 l');
  // out('30 0 612 792 re');
  // out('W n Q');
  //out('175 720 m 175 700 l h S');
};


export default bind('rect', rect);
