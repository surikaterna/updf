import bind from './bind';
import string from './string';

const text = (props, context) => {
  console.log('TXT', props);
  const { out: o } = context;
  /*  context.page.object.Contents.object.append('BT /G 24 Tf 175 720 Td');
    context.page.object.Contents.object.append(' (' + props.str || props.children + ') ');
    context.page.object.Contents.object.append('Tj ET');*/
  // context.text(props.str || props.children);
  o('BT /G 24 Tf 175 720 Td (hello) TJ ET');
  // return ['BT /G 24 Tf 175 720 Td', props.children, 'Tj ET'];
};

export default bind('text', text);