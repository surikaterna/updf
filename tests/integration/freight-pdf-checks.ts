import assert from "node:assert/strict";

export function freightGeometry(bbox: string, summaryTop = 617.8897637795277) {
  assert.equal((bbox.match(/<page /gu) ?? []).length, 1);
  assert.match(bbox, /width="595\.275591" height="841\.889764"/u);
  const words = [
    ...bbox.matchAll(/<word xMin="([^"]+)" yMin="([^"]+)" xMax="([^"]+)" yMax="([^"]+)">([^<]+)<\/word>/gu),
  ].map((match) => ({
    x: Number(match[1]),
    y: Number(match[2]),
    right: Number(match[3]),
    bottom: Number(match[4]),
    text: match[5],
  }));
  assert.ok(words.length > 180);
  for (const word of words) {
    assert.ok(word.x >= 12 && word.right <= 583.28 && word.y >= 12 && word.bottom <= 830, JSON.stringify(word));
    assert.ok(word.bottom - word.y >= 10, "Readable font size");
  }
  const band = (text: string, left: number, right: number, top: number, bottom: number) => {
    assert.ok(
      words.some(
        (word) => word.text === text && word.x >= left && word.right <= right && word.y >= top && word.bottom <= bottom,
      ),
      text,
    );
  };
  band("Invoice", 450, 583, 12, 60);
  band("Copper", 12, 295, 150, 230);
  for (const [text, left, right] of [
    ["Route", 12, 154],
    ["Vehicle", 154, 297],
    ["Shipment", 297, 440],
    ["Charges", 440, 583],
  ] as const)
    band(text, left, right, 250, 280);
  band("£267.50", 440, 583, 365, 405);
  band("NET", 240, 583, summaryTop, summaryTop + 28);
  band("£317.73", 490, 583, summaryTop + 103, summaryTop + 143);
  band("billing@example.invalid", 12, 200, 806, 830);
  assert.ok(!words.some((word) => word.y > 410 && word.y < summaryTop), "Real elastic whitespace");
  noOverlaps(words);
}
function noOverlaps(
  words: readonly { x: number; y: number; right: number; bottom: number; text: string | undefined }[],
) {
  for (let i = 0; i < words.length; i++) {
    const a = words[i]!;
    for (const b of words.slice(i + 1)) {
      assert.ok(
        Math.min(a.right, b.right) - Math.max(a.x, b.x) <= 0.1 ||
          Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) <= 0.1,
        `Overlap: ${a.text}/${b.text}`,
      );
    }
  }
}
export function freightRaster(ppm: Buffer, summaryTop = 617.8897637795277) {
  const header = /^P6\s+(\d+) (\d+)\s+255\s/u.exec(ppm.subarray(0, 60).toString("ascii"));
  assert.ok(header);
  const width = Number(header[1]),
    height = Number(header[2]);
  assert.equal(width, 596);
  assert.equal(height, 842);
  const pixels = ppm.subarray(header[0].length);
  const pixel = (x: number, y: number) => pixels[(y * width + x) * 3] ?? 255;
  const ink = (left: number, top: number, right: number, bottom: number) => {
    let count = 0;
    for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) if (pixel(x, y) < 200) count++;
    return count;
  };
  assert.ok(ink(12, 12, 583, 120) > 1700, "Header");
  assert.ok(ink(12, 150, 583, 247) > 1400, "Paired billing and notice");
  for (const x of [20, 165, 310]) {
    assert.ok(pixel(x, 265) < 235, "Gray four-column heading");
    assert.ok(pixel(x, 380) > 240 && pixel(x, 380) < 252, "Pale shipment panels");
  }
  assert.ok(pixel(500, 265) < 235, "Charges heading");
  assert.ok(ink(440, 367, 580, 369) > 100, "Order box top border");
  assert.ok(
    ink(247, Math.floor(summaryTop + 103), 577, Math.ceil(summaryTop + 106)) > 280,
    "Invoice money box top border",
  );
  assert.ok(ink(240, Math.floor(summaryTop - 1), 583, Math.ceil(summaryTop + 3)) > 300, "Bottom-anchored summary rule");
  assert.ok(ink(12, 764, 583, 768) > 500, "Full-width terms rule");
  assert.equal(ink(12, 411, 583, Math.floor(summaryTop - 1)), 0, "Clear elastic gap");
  assert.equal(ink(0, 0, 596, 10), 0);
  assert.equal(ink(0, 830, 596, 842), 0);
}

export function freightMultipageGeometry(bbox: string, summaryTop: number) {
  const pages = [...bbox.matchAll(/<page [^>]*>([\s\S]*?)<\/page>/gu)].map((match) => match[1]!);
  assert.equal(pages.length, 2);
  for (const [index, page] of pages.entries()) {
    const words = [
      ...page.matchAll(/<word xMin="([^"]+)" yMin="([^"]+)" xMax="([^"]+)" yMax="([^"]+)">([^<]+)<\/word>/gu),
    ].map((m) => ({ x: Number(m[1]), y: Number(m[2]), right: Number(m[3]), bottom: Number(m[4]), text: m[5] }));
    noOverlaps(words);
    assert.ok(words.every((w) => w.x >= 12 && w.right <= 583.28 && w.y >= 12 && w.bottom <= 830));
    assert.equal(words.filter((w) => w.text === "Total").length, index === 1 ? 3 : 0);
    if (index === 0) assert.ok(words.some((w) => w.text === "ORDER" && w.y > 500 && w.bottom < 546));
    else {
      const net = words.find((w) => w.text === "NET");
      assert.ok(net && net.y >= summaryTop && net.y < summaryTop + 20);
      assert.ok(words.some((w) => w.text === "billing@example.invalid" && w.bottom > 820));
      assert.ok(!words.some((w) => w.y > 124 && w.y < summaryTop));
    }
  }
}
