import assert from "node:assert/strict";

export function freightWords(bbox: string) {
  return [...bbox.matchAll(/<word xMin="([^"]+)" yMin="([^"]+)" xMax="([^"]+)" yMax="([^"]+)">([^<]+)<\/word>/gu)].map(
    (m) => ({ x: Number(m[1]), y: Number(m[2]), right: Number(m[3]), bottom: Number(m[4]), text: m[5] }),
  );
}
export function freightPagesGeometry(bbox: string) {
  const pages = [...bbox.matchAll(/<page [^>]*>([\s\S]*?)<\/page>/gu)].map((m) => freightWords(m[1]!));
  assert.ok(pages.length > 0);
  for (const words of pages) {
    assert.ok(words.length > 30);
    for (const [index, a] of words.entries()) {
      assert.ok(a.x >= 12 && a.right <= 583.28 && a.y >= 12 && a.bottom <= 830, JSON.stringify(a));
      assert.ok(a.bottom - a.y >= 10, "Readable font size");
      for (const b of words.slice(index + 1))
        assert.ok(
          Math.min(a.right, b.right) - Math.max(a.x, b.x) <= 0.1 ||
            Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) <= 0.1,
          `Overlap: ${a.text}/${b.text}`,
        );
    }
  }
  return pages;
}
export function freightGeometry(bbox: string, summaryTop = 698.8897637795277) {
  const pages = freightPagesGeometry(bbox);
  assert.equal(pages.length, 1);
  assert.match(bbox, /width="595\.275591" height="841\.889764"/u);
  const words = pages[0]!;
  const band = (text: string, left: number, right: number, top: number, bottom: number) =>
    assert.ok(
      words.some((w) => w.text === text && w.x >= left && w.right <= right && w.y >= top && w.bottom <= bottom),
      text,
    );
  band("Invoice", 410, 583, 12, 60);
  band("Copper", 12, 350, 150, 230);
  band("Route", 12, 197, 260, 285);
  band("Vehicle", 205, 390, 260, 285);
  band("Shipment", 398, 583, 260, 285);
  band("Charges", 12, 370, 373, 400);
  band("Payment", 12, 290, summaryTop, summaryTop + 30);
  band("summary", 303, 583, summaryTop, summaryTop + 30);
  band("billing@example.invalid", 12, 290, summaryTop + 35, summaryTop + 70);
  assert.equal(words.filter((w) => w.text === "subtotal").length, 1);
  assert.equal(words.filter((w) => w.text === "Total").length, 2);
}
export function freightRaster(ppm: Buffer, summaryTop = 698.8897637795277, tableBottom = 481) {
  const header = /^P6\s+(\d+) (\d+)\s+255\s/u.exec(ppm.subarray(0, 60).toString("ascii"));
  assert.ok(header);
  assert.equal(Number(header[1]), 596);
  assert.equal(Number(header[2]), 842);
  const pixels = ppm.subarray(header[0].length);
  const pixel = (x: number, y: number) => pixels[(y * 596 + x) * 3] ?? 255;
  const ink = (left: number, top: number, right: number, bottom: number) => {
    let count = 0;
    for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) if (pixel(x, y) < 200) count++;
    return count;
  };
  assert.ok(ink(12, 12, 583, 120) > 1700, "Header");
  assert.ok(ink(12, 150, 583, 250) > 1400, "Billing");
  for (const x of [20, 215, 410]) assert.ok(pixel(x, 265) < 235, "Three shipment headings");
  assert.ok(ink(12, 373, 583, 375) > 500, "Table top rule");
  assert.ok(ink(12, 399, 583, 402) > 500, "Table header rule");
  assert.ok(ink(12, Math.floor(summaryTop), 583, Math.ceil(summaryTop + 2)) > 500, "Summary top rule");
  assert.ok(ink(309, Math.floor(summaryTop + 68), 577, Math.ceil(summaryTop + 71)) > 250, "Total box rule");
  assert.equal(ink(12, tableBottom + 1, 583, Math.floor(summaryTop)), 0, "Elastic whitespace");
  assert.equal(ink(0, 0, 596, 10), 0);
  assert.equal(ink(0, 830, 596, 842), 0);
}
