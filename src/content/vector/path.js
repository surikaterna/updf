const KAPPA = 0.5522848;

export default class Path {
  constructor(out) {
    this._out = out;
  }
  moveTo(x, y) {
    this._out(`${x} ${y} m`);
    return this;
  }
  lineTo(x, y) {
    this._out(`${x} ${y} l`);
    return this;
  }
  bezierCurveTo(c1x, c1y, c2x, c2y, x, y) {
    this._out(`${c1x} ${c1y} ${c2x} ${c2y} ${x} ${y} c`);
    return this;
  }
  quadraticCurveTo(cx, cy, x, y) {
    this._out(`${cx} ${cy} ${x} ${y} v`);
    return this;
  }
  rect(x, y, width, height) {
    this._out(`${x} ${y} ${width} ${height} re`);
    return this;
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

    return this.moveTo(x, ym)
      .bezierCurveTo(x, ym - oy, xm - ox, y, xm, y)
      .bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym)
      .bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye)
      .bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym)
      .close()
  }

  close() {
    this._out('h');
  }
}