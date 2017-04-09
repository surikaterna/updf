import bind from '../bind';

const border = (props, context) => {
  const { out } = context;
  console.log('BRD');
  if(props.style && props.style.border) {
    out(`q 0.9 0.5 0.0 RG 1 1 1 rg ${context.ax} ${(context.mediaBox[3] - context.ay)} ${context.width} ${-context.height} re S Q`);
  }
};


export default border;
