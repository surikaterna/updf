// from Inkscape svg to pdf / pdfkit
export function arcToSegments(x, y, rx, ry, large, sweep, rotateX, ox, oy) {
  const th = rotateX * (Math.PI / 180);
  const sinTh = Math.sin(th);
  const cosTh = Math.cos(th);
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const px = cosTh * (ox - x) * 0.5 + sinTh * (oy - y) * 0.5;
  const py = cosTh * (oy - y) * 0.5 - sinTh * (ox - x) * 0.5;
  let pl = (px * px) / (rx * rx) + (py * py) / (ry * ry);
  if (pl > 1) {
    pl = Math.sqrt(pl);
  }
  rx *= pl;
  ry *= pl;

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
    result[i] = [xc, yc, th2, th3, rx, ry, sinTh, cosTh]
  }

  return result;
}

function segmentToBezier(cx, cy, th0, th1, rx, ry, sinTh, cosTh) {
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

export default function solveArc(x, y, coords, ctx2d) {
  const [rx, ry, rot, large, sweep, ex, ey] = coords;
  const segs = arcToSegments(ex, ey, rx, ry, large, sweep, rot, x, y);
  segs.forEach(seg => {
    const bez = segmentToBezier(...seg);
    ctx2d.bezierCurveTo(...bez);
  });
}
