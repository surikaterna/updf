import parseColor from './parseColor';

const KAPPA = 0.5522848;

/**
 * functions ending with R is with relative coordinates
 */
export default class Context2d {
  constructor(out) {
    this._out = out;
    // current X / Y
    this._cx = 0;
    this._cy = 0;
    // (prev) anchor X / Y
    this._ax = 0;
    this._ay = 0;
  }
  moveTo(x, y) {
    this._out(`${x} ${y} m`);
    this._cx = x; this._cy = y;
    return this;
  }
  moveToR(x, y) {
    return this.moveTo(x + this._cx, y + this._cy);
  }
  lineTo(x, y) {
    this._out(`${x} ${y} l`);
    this._cx = x; this._cy = y;
    return this;
  }
  lineToR(x, y) {
    return this.lineTo(x + this._cx, y + this._cy);
  }
  hLineTo(x) {
    return this.lineTo(x, this._cy);
  }
  hLineToR(x) {
    return this.lineTo(this._cx + x, this._cy);
  }
  vLineTo(y) {
    return this.lineTo(this._cx, y);
  }
  vLineToR(y) {
    return this.lineTo(this._cx, this._cy + y);
  }
  bezierCurveTo(c1x, c1y, c2x, c2y, x, y) {
    this._cx = x;
    this._cy = y;
    this._ax = c2x;
    this._ay = c2y;
    this._out(`${c1x} ${c1y} ${c2x} ${c2y} ${x} ${y} c`);
    return this;
  }
  bezierCurveToR(c1x, c1y, c2x, c2y, x, y) {
    const cx = this._cx;
    const cy = this._cy;
    return this.bezierCurveTo(
      c1x + cx,
      c1y + cy,
      c2x + cx,
      c2y + cy,
      x + cx,
      y + cy
    );
  }
  smoothCurveTo(x2, y2, x, y) {
    this.bezierCurveTo(this._ax, this._ay, x2, y2, x, y);
  }
  smoothCurveToR(x2, y2, x, y) {
    this.bezierCurveToR(-(this._ax - this._cx), - (this._ay - this._cy), x2, y2, x, y);
  }
  quadraticCurveTo(cx, cy, x, y) {
    this._out(`${cx} ${cy} ${x} ${y} v`);
    return this;
  }
  rect(x, y, width, height) {
    this._out(`${x||0} ${y||0} ${width} ${height} re`);
    return this;
  }
  polyline(points) {
    this.polygon(points, false);
  }
  polygon(points, close = true) {
    const pts = points;
    this.moveTo(...pts.splice(0, 2));
    while (pts.length > 0) {
      this.lineTo(...pts.splice(0, 2));
    }
    if (close) {
      this.close();
    }
  }

  ellipse(x, y, r1, r2 = r1) {
    // based on http://stackoverflow.com/questions/2172798/how-to-draw-an-oval-in-html5-canvas/2173084#2173084
    const rx = x - r1;
    const ry = y - r2;
    const ox = r1 * KAPPA;
    const oy = r2 * KAPPA;
    const xe = rx + r1 * 2;
    const ye = ry + r2 * 2;
    const xm = rx + r1;
    const ym = ry + r2;
    return this.moveTo(rx, ym)
      .bezierCurveTo(rx, ym - oy, xm - ox, ry, xm, ry)
      .bezierCurveTo(xm + ox, ry, xe, ym - oy, xe, ym)
      .bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye)
      .bezierCurveTo(xm - ox, ye, rx, ym + oy, rx, ym)
      .close();
  }

  stroke() {
    this._out('S');
  }
  fill() {
    this._out('f');
  }

  // ''
  fillColor(rgb) {
    if (rgb !== 'none') {
      const clr = parseColor(rgb);
      //this._out(`DeviceRGB cs ${clr.join(' ')} scn`);
      this._out(`${clr.join(' ')} rg`);
    }
  }
  strokeColor(rgb) {
    if (rgb !== 'none') {
      const clr = parseColor(rgb);
      //this._out(`DeviceRGB cs ${clr.join(' ')} scn`);
      this._out(`${clr.join(' ')} RG`);
    }
  }
  fillAndStroke() {
    this._out('B n');
  }

  // a, b, c, d, e, f
  transform(...args) {
    this._out(`${args.join(' ')} cm`);
    return this;
  }

  translate(x, y) {
    return this.transform(1, 0, 0, 1, x, y);
  }

  scale(x, y = x) {
    return this.transform(x, 0, 0, y, 0, 0);
  }

  save() {
    this._out('q');
  }

  restore() {
    this._out('Q');
  }

  close() {
    this._out('h');
  }
}
