import bind from './bind';
import { transform } from './image';
import replaceDiacritics from './util/replaceDiacritics';

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

    const str = props.text
      ? replaceDiacritics(
          props.text
            .replace(/\\/g, '\\\\')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)')
        )
      : '';

    context.out(
      `BT /G ${fontSize} Tf 1 0 0 -1 ${style.left} ${positionBelowImage} Tm (${str}) Tj ET`
    );
  });
};

export default bind('imageWithText', imageWithText);
