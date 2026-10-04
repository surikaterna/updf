import assert from "node:assert/strict";

export const pageRanges = [
  [1, 6],
  [7, 12],
  [13, 17],
  [18, 23],
  [24, 29],
  [30, 34],
  [35, 40],
  [41, 46],
  [47, 48],
] as const;
export const identifiers = Array.from({ length: 48 }, (_, index) => `CN-${String(index + 1).padStart(3, "0")}`);

export function assertManifestText(text: string) {
  const pages = text.split("\f").filter((page) => page.trim());
  assert.equal(pages.length, 11);
  assert.deepEqual(text.match(/\bCN-\d{3}\b/g), identifiers);
  pages.forEach((page, index) => {
    assert.ok(page.includes(`Page ${index + 1}/11`));
    assert.match(page, /ORIGINAL MOCK \/ NOT FOR TRANSPORT/);
    const range = pageRanges[index - 1];
    if (!range) return;
    assert.match(
      page,
      /Receiving site\s+Goods \/ special instructions\s+C \/ P \/ Pkg\s+Gross kg\s+Time slot\s+Status/,
    );
    assert.deepEqual(page.match(/\bCN-\d{3}\b/g), identifiers.slice(range[0] - 1, range[1]));
    for (const route of new Set(
      identifiers.slice(range[0] - 1, range[1]).map((id) => `R${Math.ceil(Number(id.slice(3)) / 16)}`),
    ))
      assert.ok(page.includes(`${route} / ID`));
  });
  assert.match(pages[0] ?? "", /DISPATCH SUMMARY/);
  assertRouteTotals(pages[0] ?? "");
  assert.match(pages[3] ?? "", /R2 \/ Workshop circuit \/ LOADING ORDER/);
  assert.match(pages[6] ?? "", /R3 \/ Market circuit \/ LOADING ORDER/);
  for (const [previous, heading, next] of [
    ["CN-016", "R2 / Workshop circuit / LOADING ORDER", "CN-017"],
    ["CN-032", "R3 / Market circuit / LOADING ORDER", "CN-033"],
  ]) {
    assert.ok(text.indexOf(previous ?? "") < text.indexOf(heading ?? ""));
    assert.ok(text.indexOf(heading ?? "") < text.indexOf(next ?? ""));
  }
  assert.match(pages[10] ?? "", /RECONCILIATION \/ UNSIGNED ACKNOWLEDGMENT/);
  for (const page of [pages[0], pages[10]]) {
    assert.match(page ?? "", /Consignments\s+48/);
    assert.match(page ?? "", /Loose cartons\s+186/);
    assert.match(page ?? "", /Loaded pallets\s+45/);
    assert.match(page ?? "", /Handling packages\s+231/);
    assert.match(page ?? "", /Gross load mass\s+5467\.500 kg/);
  }
  assert.match(pages[10] ?? "", /Unsigned mock document - no signature or approval supplied/);
}
function assertRouteTotals(page: string) {
  assert.match(page, /R1 \/ Quayside circuit: 16 consignments; 62 cartons \+ 15 pallets = 77 packages; 1672\.500 kg/);
  assert.match(page, /R2 \/ Workshop circuit: 16 consignments; 62 cartons \+ 15 pallets = 77 packages; 1822\.500 kg/);
  assert.match(page, /R3 \/ Market circuit: 16 consignments; 62 cartons \+ 15 pallets = 77 packages; 1972\.500 kg/);
}

export function assertManifestGeometry(bbox: string) {
  const pages = bbox.match(/<page\b[^>]*>[\s\S]*?<\/page>/g) ?? [];
  assert.equal(pages.length, 11);
  pages.forEach((page, index) => {
    const portrait = index === 0 || index === 10,
      bottom = portrait ? 841.889764 : 595.275591,
      right = portrait ? 595.275591 : 841.889764;
    assert.match(
      page,
      portrait ? /width="595\.275591" height="841\.889764"/ : /width="841\.889764" height="595\.275591"/,
    );
    const words = [
      ...page.matchAll(/<word xMin="([^"]+)" yMin="([^"]+)" xMax="([^"]+)" yMax="([^"]+)">([^<]+)<\/word>/g),
    ];
    assert.ok(words.length > 60);
    for (const word of words) {
      assert.ok(Number(word[1]) >= 30 && Number(word[3]) <= right - 30, word[0]);
      assert.ok(Number(word[2]) >= 30 && Number(word[4]) <= bottom - 30, word[0]);
      if (/^CN-\d{3}$/.test(word[5] ?? ""))
        assert.ok(
          Number(word[1]) >= 36 && Number(word[3]) < 88 && Number(word[2]) > 78 && Number(word[4]) < bottom - 48,
        );
    }
    assert.ok(words.some((word) => word[5] === "MOCK" && Number(word[2]) < 54));
    assert.ok(words.some((word) => word[5] === "TRANSPORT" && Number(word[2]) > bottom - 49));
  });
}

function raster(ppm: Buffer) {
  const header = /^P6\s+(\d+) (\d+)\s+255\s/u.exec(ppm.subarray(0, 60).toString("ascii"));
  assert.ok(header);
  const width = Number(header[1]),
    height = Number(header[2]),
    pixels = ppm.subarray(header[0].length);
  assert.equal(pixels.length, width * height * 3);
  return { width, height, pixels, offset: header[0].length };
}
export function assertManifestRaster(ppm: Buffer, portrait: boolean) {
  const { width, height, pixels } = raster(ppm);
  assert.equal(width, portrait ? 596 : 842);
  assert.equal(height, portrait ? 842 : 596);
  const ink = (left: number, top: number, right: number, bottom: number) => {
    let count = 0;
    for (let y = top; y < bottom; y++)
      for (let x = left; x < right; x++) if ((pixels[(y * width + x) * 3] ?? 255) < 220) count++;
    return count;
  };
  assert.ok(ink(30, 30, width - 30, 54) > 200, "Header ink");
  assert.ok(ink(30, height - 50, width - 30, height - 29) > 200, "Footer ink");
  assert.equal(ink(0, 0, width, 25), 0, "Top boundary");
  assert.equal(ink(0, height - 24, width, height), 0, "Bottom boundary");
  assert.equal(ink(0, 0, 25, height), 0, "Left boundary");
  assert.equal(ink(width - 24, 0, width, height), 0, "Right boundary");
  if (portrait) return;
  assert.ok(
    pixels.filter(
      (value, index) =>
        index % 3 === 0 &&
        value >= 222 &&
        value <= 226 &&
        (pixels[index + 1] ?? 0) >= 238 &&
        (pixels[index + 2] ?? 0) >= 240,
    ).length > 50,
    "Care Span background highlights",
  );
  assert.ok(ink(90, 54, 810, 100) > 200, "Repeated table header");
  for (const x of [30, 88, 233, 520, 585, 665, 740, 811])
    assert.ok(ink(x - 1, 54, x + 1, 540) > 120, `Grid column ${x}`);
}
export function eraseRegion(ppm: Buffer, left: number, top: number, right: number, bottom: number) {
  const result = Buffer.from(ppm),
    { width, offset } = raster(result);
  for (let y = top; y < bottom; y++)
    result.fill(255, offset + (y * width + left) * 3, offset + (y * width + right) * 3);
  return result;
}
export function eraseHighlights(ppm: Buffer) {
  const result = Buffer.from(ppm),
    { pixels } = raster(result);
  for (let index = 0; index < pixels.length; index += 3) {
    if (
      (pixels[index] ?? 0) >= 222 &&
      (pixels[index] ?? 0) <= 226 &&
      (pixels[index + 1] ?? 0) >= 238 &&
      (pixels[index + 2] ?? 0) >= 240
    )
      pixels.fill(255, index, index + 3);
  }
  return result;
}
