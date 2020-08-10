
const translations = {
  // Polish
  Ą: 'A', ą: 'a',
  Ć: 'C', ć: 'c',
  Ę: 'E', ę: 'e',
  Ł: 'L', ł: 'l',
  Ń: 'N', ń: 'n',
  Ó: 'O', ó: 'o',
  Ò: 'O', ò: 'o',
  Ś: 'S', ś: 's',
  Ź: 'Z', ź: 'z',
  Ż: 'Z', ż: 'z',

  // German
  Ä: 'Ae', ä: 'ae',
  Ö: 'Oe', ö: 'oe',
  Ü: 'Ue', ü: 'ue',
  ß: 'ss'
};

const replaceDiacritics = function (s = '') {
  const chars = Object.keys(translations);
  const regExp = new RegExp(`[${chars.join('')}]`, 'g');
  return s.replace(regExp, $0 => translations[$0]);
};

export default replaceDiacritics;
