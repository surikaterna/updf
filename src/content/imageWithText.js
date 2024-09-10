import bind from "./bind";

const number = (n) => {
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

  const values = [m11, m12, m21, m22, dx, dy].map((v) => number(v)).join(" ");
  return `${values} cm`;
};

const imageWithText = (props, context) => {
  const string = props.children[0].props.str;
  const data = Buffer.from(JSON.parse(string).data);
  const xObject = context.document.addImage(data);
  const labels = Object.keys(xObject);
  const style = props.style;

  labels.forEach((label) => {
    const transformation = transform(
      style.width,
      0,
      0,
      -style.height,
      style.left,
      style.top + style.height
    );

    context.out(`q ${transformation} /${label} Do Q`);

    const positionBelowImage = style.top + style.height + 10;
    const fontSize = props.fontSize || 10;

    context.out(
      `BT /G ${fontSize} Tf 1 0 0 -1 ${style.left} ${positionBelowImage} Tm (${
        props.text || ""
      }) Tj ET`
    );
  });
};

export default bind("imageWithText", imageWithText);
