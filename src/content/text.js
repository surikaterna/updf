import bind from './bind';

const text = (props, context) => {
  const { out: o } = context;

  if (!props.str) {
    return;
  }

  // Convert text to UTF-16LE (WITHOUT BOM)
  const utf16Buffer = Buffer.from(props.str, 'utf16le');

  // Wrap in brackets <> for proper PDF UTF-16 syntax
  const pdfText = `<${utf16Buffer.toString('hex')}>`;

  if (props.style && props.style.height) {
    o(`BT /G ${context.fontSize} Tf -1.1 Tc 1 0 0 -1 ${context.ax} ${context.ay + props.style.height} Tm ${pdfText} Tj ET`);
  }
};

export default bind('text', text);
