//import solveArc from './solveArc';
import parseColor from './parseColor';
const a2c = require('./a2c');

const KAPPA = 0.5522848;

const _f = (f) => Number(Number(f).toFixed(4)).toString();



const TAU = Math.PI * 2

const mapToEllipse = ({ x, y }, rx, ry, cosphi, sinphi, centerx, centery) => {
  x *= rx
  y *= ry

  const xp = cosphi * x - sinphi * y
  const yp = sinphi * x + cosphi * y

  return {
    x: xp + centerx,
    y: yp + centery
  }
}

const approxUnitArc = (ang1, ang2) => {
  const a = 4 / 3 * Math.tan(ang2 / 4)

  const x1 = Math.cos(ang1)
  const y1 = Math.sin(ang1)
  const x2 = Math.cos(ang1 + ang2)
  const y2 = Math.sin(ang1 + ang2)

  return [
    {
      x: x1 - y1 * a,
      y: y1 + x1 * a
    },
    {
      x: x2 + y2 * a,
      y: y2 - x2 * a
    },
    {
      x: x2,
      y: y2
    }
  ]
}

const vectorAngle = (ux, uy, vx, vy) => {
  const sign = (ux * vy - uy * vx < 0) ? -1 : 1
  const umag = Math.sqrt(ux * ux + uy * uy)
  const vmag = Math.sqrt(ux * ux + uy * uy)
  const dot = ux * vx + uy * vy

  let div = dot / (umag * vmag)

  if (div > 1) {
    div = 1
  }

  if (div < -1) {
    div = -1
  }

  return sign * Math.acos(div)
}

const getArcCenter = (
  px,
  py,
  cx,
  cy,
  rx,
  ry,
  largeArcFlag,
  sweepFlag,
  sinphi,
  cosphi,
  pxp,
  pyp
) => {
  const rxsq = Math.pow(rx, 2)
  const rysq = Math.pow(ry, 2)
  const pxpsq = Math.pow(pxp, 2)
  const pypsq = Math.pow(pyp, 2)

  let radicant = (rxsq * rysq) - (rxsq * pypsq) - (rysq * pxpsq)

  if (radicant < 0) {
    radicant = 0
  }

  radicant /= (rxsq * pypsq) + (rysq * pxpsq)
  radicant = Math.sqrt(radicant) * (largeArcFlag === sweepFlag ? -1 : 1)

  const centerxp = radicant * rx / ry * pyp
  const centeryp = radicant * -ry / rx * pxp

  const centerx = cosphi * centerxp - sinphi * centeryp + (px + cx) / 2
  const centery = sinphi * centerxp + cosphi * centeryp + (py + cy) / 2

  const vx1 = (pxp - centerxp) / rx
  const vy1 = (pyp - centeryp) / ry
  const vx2 = (-pxp - centerxp) / rx
  const vy2 = (-pyp - centeryp) / ry

  let ang1 = vectorAngle(1, 0, vx1, vy1)
  let ang2 = vectorAngle(vx1, vy1, vx2, vy2)

  if (sweepFlag === 0 && ang2 > 0) {
    ang2 -= TAU
  }

  if (sweepFlag === 1 && ang2 < 0) {
    ang2 += TAU
  }

  return [centerx, centery, ang1, ang2]
}

const arcToBezier = ({
  px,
  py,
  cx,
  cy,
  rx,
  ry,
  xAxisRotation = 0,
  largeArcFlag = 0,
  sweepFlag = 0
}) => {
  const curves = []

  if (rx === 0 || ry === 0) {
    return []
  }

  const sinphi = Math.sin(xAxisRotation * TAU / 360)
  const cosphi = Math.cos(xAxisRotation * TAU / 360)

  const pxp = cosphi * (px - cx) / 2 + sinphi * (py - cy) / 2
  const pyp = -sinphi * (px - cx) / 2 + cosphi * (py - cy) / 2

  if (pxp === 0 && pyp === 0) {
    return []
  }

  rx = Math.abs(rx)
  ry = Math.abs(ry)

  const lambda =
    Math.pow(pxp, 2) / Math.pow(rx, 2) +
    Math.pow(pyp, 2) / Math.pow(ry, 2)

  if (lambda > 1) {
    rx *= Math.sqrt(lambda)
    ry *= Math.sqrt(lambda)
  }

  let [centerx, centery, ang1, ang2] = getArcCenter(
    px,
    py,
    cx,
    cy,
    rx,
    ry,
    largeArcFlag,
    sweepFlag,
    sinphi,
    cosphi,
    pxp,
    pyp
  )

  const segments = Math.max(Math.ceil(Math.abs(ang2) / (TAU / 4)), 1)

  ang2 /= segments

  for (let i = 0; i < segments; i++) {
    curves.push(approxUnitArc(ang1, ang2))
    ang1 += ang2
  }

  return curves.map(curve => {
    const { x: x1, y: y1 } = mapToEllipse(curve[0], rx, ry, cosphi, sinphi, centerx, centery)
    const { x: x2, y: y2 } = mapToEllipse(curve[1], rx, ry, cosphi, sinphi, centerx, centery)
    const { x, y } = mapToEllipse(curve[2], rx, ry, cosphi, sinphi, centerx, centery)

    return { x1, y1, x2, y2, x, y }
  })
}

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

    this._curr = [];
  }

  _draw(str) {
    this._curr.push(str);
  }
  _isDirty() {
    return this._curr.length > 0;
  }

  moveTo(x, y) {
    this._draw(`${_f(x)} ${_f(y)} m`);
    this._cx = x; this._cy = y;
    this._ax = this._ay = undefined;
    return this;
  }
  moveToR(x, y) {
    return this.moveTo(x + this._cx, y + this._cy);
  }
  lineTo(x, y) {
    this._draw(`${_f(x)} ${_f(y)} l`);
    this._cx = x; this._cy = y;
    this._ax = this._ay = undefined;
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
    this._draw(`${_f(c1x)} ${_f(c1y)} ${_f(c2x)} ${_f(c2y)} ${_f(x)} ${_f(y)} c`);
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
    if(this._ax === undefined) {
      this._ax = this._cx;
      this._ay = this._cy;
    }
    this.bezierCurveTo(this._cx - (this._ax - this._cx), this._cy - (this._ay - this._cy), x2, y2, x, y);
  }
  smoothCurveToR(x2, y2, x, y) {
    if(this._ax === undefined) {
      this._ax = this._cx;
      this._ay = this._cy;
    }
    this.bezierCurveTo(this._cx - (this._ax - this._cx), this._cy - (this._ay - this._cy), this._cx + x2, this._cy + y2, this._cx + x, this._cy + y);
  }
  quadraticCurveTo(cx, cy, x, y) {
    this._draw(`${_f(cx)} ${_f(cy)} ${_f(x)} ${_f(y)} v`);
    return this;
  }
  rect(x, y, width, height) {
    this._draw(`${_f(x || 0)} ${_f(y || 0)} ${_f(width)} ${_f(height)} re`);
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
  arcTo(...args) {
    this.solveArc(this._cx, this._cy, args, this);
    this._cx = args[5];
    this._cy = args[6];
  }
  arcToR(...args) {
    //    this.arcTo([args[0], args[1], args[2], args[3], args[4], args[5] + this._cx, args[6] + this._cy]);
    args[5] += this._cx;
    args[6] += this._cy;
    this.solveArc(this._cx, this._cy, args, this);
    this._cx = args[5];
    this._cy = args[6];
  }

  _flush(op) {
    if (this._isDirty()) {
      this._out(this._curr.join('\n'));
      this._out(op);
          this._curr = [];
      //this.clear();
    }
  }
  stroke() {
    this._flush('S');
  }
  fill() {
    this._flush('f');
  }

  fillAndStroke() {
    this._flush('B n');
  }
  clear() {
    this._curr = [];
  }
  // ''
  fillColor(rgb) {
    if (rgb !== 'none') {
      const clr = parseColor(rgb);
      //this._out(`DeviceRGB cs ${_f(clr.join(' '))} scn`);
      this._out(`${clr.join(' ')} rg`);
    }
  }
  strokeColor(rgb) {
    if (rgb !== 'none') {
      const clr = parseColor(rgb);
      //this._out(`DeviceRGB cs ${_f(clr.join(' '))} scn`);
      this._out(`${clr.join(' ')} RG`);
    }
  }

  // a, b, c, d, e, f
  transform(...args) {
    this._out(`${args.map(f => _f(f)).join(' ')} cm`);
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
    this._draw('h');
  }

  arcToSegments(x, y, rx, ry, large, sweep, rotateX, ox, oy) {
    const th = rotateX * (Math.PI / 180);
    const sinTh = Math.sin(th);
    const cosTh = Math.cos(th);
    rx = Math.abs(rx);
    ry = Math.abs(ry);
    const this_ax = cosTh * (ox - x) * 0.5 + sinTh * (oy - y) * 0.5;
    const this_ay = cosTh * (oy - y) * 0.5 - sinTh * (ox - x) * 0.5;
    let pl = (this_ax * this_ax) / (rx * rx) + (this_ay * this_ay) / (ry * ry);
    if (pl > 1) {
      pl = Math.sqrt(pl);
      rx *= pl;
      ry *= pl;
    }

    const a00 = cosTh / rx;
    const a01 = sinTh / rx;
    const a10 = (-sinTh) / ry;
    const a11 = (cosTh) / ry;
    const x0 = a00 * ox + a01 * oy;
    const y0 = a10 * ox + a11 * oy;
    const x1 = a00 * x + a01 * y;
    const y1 = a10 * x + a11 * y;

    const d = (x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0);
    let sfactorSq = 1 / d - 0.25;
    if (sfactorSq < 0) {
      sfactorSq = 0;
    }

    let sfactor = Math.sqrt(sfactorSq);
    if (sweep === large) {
      sfactor = -sfactor;
    }

    const xc = 0.5 * (x0 + x1) - sfactor * (y1 - y0);
    const yc = 0.5 * (y0 + y1) + sfactor * (x1 - x0);

    const th0 = Math.atan2(y0 - yc, x0 - xc);
    const th1 = Math.atan2(y1 - yc, x1 - xc);

    let thArc = th1 - th0;
    if (thArc < 0 && sweep === 1) {
      thArc += 2 * Math.PI;
    } else if (thArc > 0 && sweep === 0) {
      thArc -= 2 * Math.PI;
    }

    const segments = Math.ceil(Math.abs(thArc / (Math.PI * 0.5 + 0.001)));
    const result = [];

    for (let i = 0; i < segments; i++) {
      const th2 = th0 + i * thArc / segments;
      const th3 = th0 + (i + 1) * thArc / segments;
      result[i] = [xc, yc, th2, th3, rx, ry, sinTh, cosTh];
    }

    return result;
  }

  segmentToBezier(cx, cy, th0, th1, rx, ry, sinTh, cosTh) {
    const a00 = cosTh * rx;
    const a01 = -sinTh * ry;
    const a10 = sinTh * rx;
    const a11 = cosTh * ry;

    const thHalf = 0.5 * (th1 - th0);
    const t = (8 / 3) * Math.sin(thHalf * 0.5) * Math.sin(thHalf * 0.5) / Math.sin(thHalf);
    const x1 = cx + Math.cos(th0) - t * Math.sin(th0);
    const y1 = cy + Math.sin(th0) + t * Math.cos(th0);
    const x3 = cx + Math.cos(th1);
    const y3 = cy + Math.sin(th1);
    const x2 = x3 + t * Math.sin(th1);
    const y2 = y3 - t * Math.cos(th1);

    return [
      a00 * x1 + a01 * y1, a10 * x1 + a11 * y1,
      a00 * x2 + a01 * y2, a10 * x2 + a11 * y2,
      a00 * x3 + a01 * y3, a10 * x3 + a11 * y3
    ];
  }

  solveArc(x, y, s, ctx2d) {
    //    const [rx, ry, rot, large, sweep, ex, ey] = coords;
    const newSegs = a2c(x, y, s[5], s[6], s[3], s[4], s[0], s[1], s[2]);
    newSegs.forEach(seg => {
      this.bezierCurveTo(seg[2], seg[3], seg[4], seg[5], seg[6], seg[7]);
    });
    // const segs = this.arcToSegments(ex, ey, rx, ry, large, sweep, rot, x, y);
    //     segs.forEach(seg => {
    //       const bez = this.segmentToBezier(...seg);
    //       console.log('BEZ', bez);
    //       ctx2d.bezierCurveTo(...bez);
    //     });
    
  }

}
