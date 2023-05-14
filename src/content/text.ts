import bind from './bind';
import replaceDiacritics from './util/replaceDiacritics';

const text = (props, context) => {
  // console.log('TXT', props, context.ax, context.ay, context.mediaBox);
  const { out: o } = context;
  const str = props.str && replaceDiacritics(props.str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'));
  /*  context.page.object.Contents.object.append('BT /G 24 Tf 175 720 Td');
    context.page.object.Contents.object.append(' (' + props.str || props.children + ') ');
    context.page.object.Contents.object.append('Tj ET');*/
  // context.text(props.str || props.children);
  if (props.style && props.style.height) {
    o('BT /G ' + context.fontSize + ' Tf 1 0 0 -1 ' + context.ax + ' ' + (context.ay + props.style.height) + ' Tm (' + str + ') Tj ET');
  }
  // return ['BT /G 24 Tf 175 720 Td', props.children, 'Tj ET'];
};

export default bind('text', text);
