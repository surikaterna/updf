import bind from './bind';
import { width as A4Width, height as A4Height } from '../boxes/a4';

const number = n => {
  if (n > -1e21 && n < 1e21) {
    return Math.round(n * 1e6) / 1e6;
  }
  throw new Error(`unsupported number: ${n}`);
};

const transform = (m11, m12, m21, m22, dx, dy) => {
  const matrix = [1, 0, 0, 1, 0, 0];
  const [m0, m1, m2, m3, m4, m5] = matrix;

  matrix[0] = m0 * m11 + m2 * m12;
  matrix[1] = m1 * m11 + m3 * m12;
  matrix[2] = m0 * m21 + m2 * m22;
  matrix[3] = m1 * m21 + m3 * m22;
  matrix[4] = m0 * dx + m2 * dy + m4;
  matrix[5] = m1 * dx + m3 * dy + m5;

  const values = [m11, m12, m21, m22, dx, dy].map(v => number(v)).join(' ');
  return `${values} cm`;
};

const getTransformation = (imageSize) => {
  const { width, height } = imageSize;
  const [bw, bh] = [A4Width, A4Height];
  const bp = bw / bh;
  const ip = width / height;

  let x = 0;
  let y = 0;
  let w = width;
  let h = height;

  if (ip > bp) {
    w = bw;
    h = bw / ip;
  } else {
    h = bh;
    w = bh * ip;
  }

  x = x + bw / 2 - w / 2;
  y = y + bh / 2 - h / 2;

  return transform(w, 0, 0, -h, x, y + h);
};

const image = (props, context) => {
  const { out, document } = context;

  const binary = props.children[0].props.str.trim();
  const updatedDocument = document.addImage(binary);
  const xObject = updatedDocument.currentPage().object.Resources.object.XObject;
  const names = Object.keys(xObject);
  console.log({ names, binary });

  names.forEach(name => {
    const { Width, Height } = xObject[name]._obj;
    const imageSize = { width: Width, height: Height };
    const transformation = getTransformation(imageSize);
    out(`q ${transformation} /${name} Do Q`);
  });
};

export default bind('image', image);
