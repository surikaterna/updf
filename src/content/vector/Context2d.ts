import a2c from './a2c';
import parseColor from './parseColor';

const KAPPA = 0.5522848;

const _f = (f: number): string => Number(Number(f).toFixed(4)).toString();

export type OutFunc = (op: string) => void;

/**
 * functions ending with R is with relative coordinates
 */
export default class Context2d {
  _ax?: number;
  _ay?: number;
  _curr: Array<string>;
  _cx: number;
  _cy: number;
  _out: OutFunc;

  constructor(out: OutFunc) {
    this._out = out;
    // current X / Y
    this._cx = 0;
    this._cy = 0;
    // (prev) anchor X / Y
    this._ax = 0;
    this._ay = 0;

    this._curr = [];
  }

  _draw(str: string): void {
    this._curr.push(str);
  }

  _isDirty(): boolean {
    return this._curr.length > 0;
  }

  moveTo(x: number, y: number): Context2d {
    this._draw(`${_f(x)} ${_f(y)} m`);
    this._cx = x;
    this._cy = y;
    this._ax = this._ay = undefined;
    return this;
  }

  moveToR(x: number, y: number): Context2d {
    return this.moveTo(x + this._cx, y + this._cy);
  }

  lineTo(x: number, y: number): Context2d {
    this._draw(`${_f(x)} ${_f(y)} l`);
    this._cx = x;
    this._cy = y;
    this._ax = this._ay = undefined;
    return this;
  }

  lineToR(x: number, y: number): Context2d {
    return this.lineTo(x + this._cx, y + this._cy);
  }

  hLineTo(x: number): Context2d {
    return this.lineTo(x, this._cy);
  }

  hLineToR(x: number): Context2d {
    return this.lineTo(this._cx + x, this._cy);
  }

  vLineTo(y: number): Context2d {
    return this.lineTo(this._cx, y);
  }

  vLineToR(y: number): Context2d {
    return this.lineTo(this._cx, this._cy + y);
  }

  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): Context2d {
    this._cx = x;
    this._cy = y;
    this._ax = c2x;
    this._ay = c2y;
    this._draw(`${_f(c1x)} ${_f(c1y)} ${_f(c2x)} ${_f(c2y)} ${_f(x)} ${_f(y)} c`);
    return this;
  }

  bezierCurveToR(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): Context2d {
    const cx = this._cx;
    const cy = this._cy;
    return this.bezierCurveTo(c1x + cx, c1y + cy, c2x + cx, c2y + cy, x + cx, y + cy);
  }

  smoothCurveTo(x2: number, y2: number, x: number, y: number): void {
    if (this._ax === undefined) {
      this._ax = this._cx;
      this._ay = this._cy;
    }

    // @ts-expect-error This error seems correct, but refraining from changes for now
    this.bezierCurveTo(this._cx - (this._ax - this._cx), this._cy - (this._ay - this._cy), x2, y2, x, y);
  }

  smoothCurveToR(x2: number, y2: number, x: number, y: number): void {
    if (this._ax === undefined) {
      this._ax = this._cx;
      this._ay = this._cy;
    }

    // @ts-expect-error This error seems correct, but refraining from changes for now
    this.bezierCurveTo(this._cx - (this._ax - this._cx), this._cy - (this._ay - this._cy), this._cx + x2, this._cy + y2, this._cx + x, this._cy + y);
  }

  quadraticCurveTo(cx: number, cy: number, x: number, y: number): Context2d {
    this._cx = x;
    this._cy = y;
    this._draw(`${_f(cx)} ${_f(cy)} ${_f(x)} ${_f(y)} v`);
    return this;
  }

  quadraticCurveToR(cx: number, cy: number, x: number, y: number): Context2d {
    const cx_old = this._cx;
    const cy_old = this._cy;
    return this.quadraticCurveTo(cx + cx_old, cy + cy_old, x + cx_old, y + cy_old);
  }

  rect(x: number, y: number, width: number, height: number): Context2d {
    this._draw(`${_f(x || 0)} ${_f(y || 0)} ${_f(width)} ${_f(height)} re`);
    return this;
  }

  polyline(points: any) {
    this.polygon(points, false);
  }

  polygon(points: Array<number>, close = true): void {
    const pts = points;
    // @ts-expect-error TS(2556): A spread argument must either have a tuple type or... Remove this comment to see the full error message
    this.moveTo(...pts.splice(0, 2));
    while (pts.length > 0) {
      // @ts-expect-error TS(2556): A spread argument must either have a tuple type or... Remove this comment to see the full error message
      this.lineTo(...pts.splice(0, 2));
    }
    if (close) {
      this.close();
    }
  }

  ellipse(x: number, y: number, r1: number, r2 = r1): void {
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

  arcTo(...args: Array<number>): void {
    this.solveArc(this._cx, this._cy, args);
    this._cx = args[5];
    this._cy = args[6];
  }

  arcToR(...args: Array<number>): void {
    args[5] += this._cx;
    args[6] += this._cy;
    this.solveArc(this._cx, this._cy, args);
    this._cx = args[5];
    this._cy = args[6];
  }

  _flush(op: string): void {
    if (this._isDirty()) {
      this._out(this._curr.join('\n'));
      this._out(op);
      this._curr = [];
    }
  }

  stroke(): void {
    this._flush('S');
  }

  fill(): void {
    this._flush('f');
  }

  fillAndStroke(): void {
    this._flush('B n');
  }

  clear(): void {
    this._curr = [];
  }

  fillColor(rgb: string): void {
    if (rgb !== 'none') {
      const clr = parseColor(rgb);
      this._out(`${clr.join(' ')} rg`);
    }
  }

  strokeColor(rgb: string): void {
    if (rgb !== 'none') {
      const clr = parseColor(rgb);
      //this._out(`DeviceRGB cs ${_f(clr.join(' '))} scn`);
      this._out(`${clr.join(' ')} RG`);
    }
  }

  transform(...args: Array<number>): Context2d {
    this._out(`${args.map((f) => _f(f)).join(' ')} cm`);
    return this;
  }

  translate(x: number, y: number): Context2d {
    return this.transform(1, 0, 0, 1, x, y);
  }

  scale(x: number, y = x): Context2d {
    return this.transform(x, 0, 0, y, 0, 0);
  }

  save(): void {
    this._out('q');
  }

  restore(): void {
    this._out('Q');
  }

  close(): void {
    this._draw('h');
  }

  solveArc(x: number, y: number, s: Array<number>) {
    const newSegs = a2c(x, y, s[5], s[6], s[3], s[4], s[0], s[1], s[2]);
    newSegs.forEach((seg: any) => {
      this.bezierCurveTo(seg[2], seg[3], seg[4], seg[5], seg[6], seg[7]);
    });
  }
}
