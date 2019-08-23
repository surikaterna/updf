
const umlautTranslations = {
  // Polish
  Ą: 'A', ą: 'a',
  Ć: 'C', ć: 'c',
  Ę: 'E', ę: 'e',
  Ł: 'L', ł: 'l',
  Ń: 'N', ń: 'n',
  Ó: 'O', ó: 'o',
  Ś: 'S', ś: 's',
  Ź: 'Z', ź: 'z',
  Ż: 'Z', ż: 'z',

  // German
  Ä: 'Ae', ä: 'ae',
  Ö: 'Oe', ö: 'oe',
  Ü: 'Ue', ü: 'ue',
  ß: 'ss'
};

const replaceUmlauts = function (s = '') {
  return s.replace(/[ĄąĆćĘęŁłŃńÓóŚśŹźŻżÄäÖöÜüß]/g, $0 => umlautTranslations[$0]);
};

export default replaceUmlauts;
