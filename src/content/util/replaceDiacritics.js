const unicodeChars = /[\u0300-\u036F]/g;

export default function replaceDiacritics(str) {
  if (typeof str !== 'string') {
    return str;
  }
  const normalized = str.normalize('NFKD').replace(unicodeChars, '');
  const buffer = Buffer.from(normalized, 'utf8');
  return buffer.toString('ascii');
}
