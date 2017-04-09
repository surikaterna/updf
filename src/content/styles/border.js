import bind from '../bind';

const border = (props, context) => {
  const { out } = context;
  console.log('BRD');
  out(`q 0.9 0.5 0.0 RG 1 1 1 rg ${context.ax} ${context.py} ${context.width} ${-context.height} re S Q`);
};


export default border;
