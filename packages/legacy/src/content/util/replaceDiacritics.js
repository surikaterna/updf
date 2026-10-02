const unicodeChars = /[\u0300-\u036F]/g;
const specialCharsTranslations = {
  Ł: 'L', ł: 'l'
};
const specialChars = Object.keys(specialCharsTranslations);
const specialCharsRegexp = new RegExp(`[${specialChars.join('')}]`, 'g');

export default function replaceDiacritics(str) {
  if (typeof str !== 'string') {
    return str;
  }

  const normalized = str.normalize('NFKD').replace(specialCharsRegexp, $0 => specialCharsTranslations[$0]).replace(unicodeChars, '');
  const buffer = Buffer.from(normalized, 'utf8');
  return buffer.toString('ascii');
}
