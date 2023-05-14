import bind from '../bind';
import rect from '../svg/Rect';
import svg from '../svg/Svg';

const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%*';
const encoding = 'g65mzbi8nnitg5zn05i9hg3bmzhi8tn4nidznk5h7bn9hiitgonn4tie5h7hn5zifbnkhh8nn9tij5gxzn75ighh9tmdze3bmhhdsnmete45dpzme5e3hdhhdhtdn5g0hrlm';

function sym(ch: any) {
  const index = alphabet.indexOf(ch);
  if (index === -1) {
    return -1;
  } else {
    const symbol = encoding.substring(index * 3, index * 3 + 3);
    return parseInt(symbol, 36).toString(2);
  }
}

export function enc(text: any) {
  const STAR = sym('*');
  let res = STAR;
  // starts and ends with *
  const data = text.toUpperCase();
  for (const ch of data) {
    res += `${sym(ch)}0`;
  }
  // @ts-expect-error TS(2365): Operator '+' cannot be applied to types 'string | ... Remove this comment to see the full error message
  return res + STAR;
}

export const code39 = (props: any) => {
  const Svg = props.Svg || svg;
  const Rect = props.Rect || rect;
  const b = enc(props.value);
  const height = (props.style && props.style.height) || props.height || 20;
  const width = (props.style && props.style.width) || props.height || 100;
  const elemWidth = width / b.length;
  let x = 0;
  let cWidth = 0;
  const children = [...b].map((s, i) => {
    let r = null;
    if (s === '1') {
      cWidth++;
    } else if (cWidth > 0) {
      x = i * elemWidth;
      r = Rect({ x: x - elemWidth * cWidth, y: 0, width: elemWidth * cWidth, height, style: { fill: '#000', stroke: 'none' } });
      cWidth = 0;
    }
    return r;
  });

  return Svg(
    { viewBox: [0, 0, width, height], style: props.style },
    children.filter((n) => n !== null)
  );
};

// @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
export default bind(code39);
