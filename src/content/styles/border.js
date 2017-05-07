import bind from '../bind';

const border = (props, context) => {
  const { out } = context;
  if (props.style && props.style.border) {
    out(`q 0 0 0 RG 1 1 1 rg ${context.ax} ${(context.ay)} ${context.width} ${context.height} re S Q`);
  }
};


export default border;
