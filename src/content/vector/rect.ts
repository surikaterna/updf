import bind from '../bind';

const rect = (props: any, context: any): void => {
  const { out } = context;
  console.log('RECT', props, context.ax, context.ay, context.width, context.height, context.mediaBox);
  out(`1 1 1 RG 0 0 0 rg ${context.ax} ${context.ay} ${context.width} ${context.height} re f`);
};

export default bind('rect', rect);
