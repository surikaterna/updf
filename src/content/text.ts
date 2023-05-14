import bind from './bind';
import replaceDiacritics from './util/replaceDiacritics';

const text = (props: any, context: any): void => {
  const { out: o } = context;
  const str = props.str && replaceDiacritics(props.str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'));

  if (props.style && props.style.height) {
    o('BT /G ' + context.fontSize + ' Tf 1 0 0 -1 ' + context.ax + ' ' + (context.ay + props.style.height) + ' Tm (' + str + ') Tj ET');
  }
};

export default bind('text', text);
