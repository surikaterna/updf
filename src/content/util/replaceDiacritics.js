
const translations = {
  Ą: 'A', ą: 'a',
  Ć: 'C', ć: 'c',
  Ę: 'E', ę: 'e',
  Ł: 'L', ł: 'l',
  Ń: 'N', ń: 'n',
  Ś: 'S', ś: 's',
  Ź: 'Z', ź: 'z',
  Ż: 'Z', ż: 'z',
  Č: 'C', č: 'c',
  Š: 'S', š: 's',
  Ž: 'Z', ž: 'z',
  Ř: 'R', ř: 'r',
  Ů: 'Ů', ů: 'u',
  Ě: 'E', ě: 'e'
};

const replaceDiacritics = function (s = '') {
  const chars = Object.keys(translations);
  const regExp = new RegExp(`[${chars.join('')}]`, 'g');
  return s.replace(regExp, $0 => translations[$0]);
};

export default replaceDiacritics;
