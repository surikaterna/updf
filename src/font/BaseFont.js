export default class BaseFont {
  constructor(widths, kerning) {
    this._widths = widths;
    this._kerning = kerning;
  }

  /**
   * @return width of text for a 1pt size font
   */
  width(text, size = 1) {
    let width = 0;
    let kerning = 0;
    let lastCC;
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      width += (this._widths[charCode] || this._widths[0]) || 1;
      kerning += lastCC && this._kerning[lastCC] && this._kerning[lastCC][charCode] || 0;
      lastCC = charCode;
    }
    return (width / this._widths.fof + kerning / this._kerning.fof) * size;
  }
}
