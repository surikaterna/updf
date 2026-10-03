import assert from "node:assert/strict";

export interface InventoryRaster {
  readonly rgb: Buffer;
}
export interface InventoryEdge {
  readonly orientation: "horizontal" | "vertical";
  readonly coordinate: number;
  readonly from: number;
  readonly to: number;
  readonly name: string;
}
const scale = 2;
const width = 480;
export function inventoryRaster(ppm: Buffer): InventoryRaster {
  const header = /^P6\s+480 480\s+255\s/u.exec(ppm.subarray(0, 30).toString("ascii"));
  assert.ok(header, "Expected 144-DPI inventory PPM");
  const rgb = ppm.subarray(header[0].length);
  assert.equal(rgb.length, width * width * 3);
  return { rgb };
}
function pixel(raster: InventoryRaster, x: number, y: number): readonly [number, number, number] {
  assert.ok(x >= 0 && x < width && y >= 0 && y < width);
  const offset = (y * width + x) * 3;
  return [raster.rgb[offset] ?? 255, raster.rgb[offset + 1] ?? 255, raster.rgb[offset + 2] ?? 255];
}
function gridHue([r, g, b]: readonly [number, number, number]): boolean {
  return r < 200 && g - r >= 10 && b - g >= 10;
}
export function inventoryEdges(pageIndex: number): readonly InventoryEdge[] {
  assert.ok(Number.isInteger(pageIndex) && pageIndex >= 0 && pageIndex < 3);
  // Fixture: 16pt margins, 14pt preceding prose, 24pt header, four 38pt rows/page.
  // Explicit 140/68pt columns and 1pt outer-grid inset; no emitted AST/placements.
  const levels = pageIndex === 0 ? [31, 54, 92, 130, 168, 205] : [17, 40, 78, 116, 154, 191];
  const horizontal: InventoryEdge[] = levels.map((coordinate, index) => ({
    orientation: "horizontal",
    coordinate,
    from: 17,
    to: 223,
    name: `page ${pageIndex} horizontal ${index}`,
  }));
  const vertical = [17, 156, 223].flatMap((coordinate, column) =>
    levels.slice(1).map((to, row) => ({
      orientation: "vertical" as const,
      coordinate,
      from: levels[row] ?? 0,
      to,
      name: `page ${pageIndex} vertical ${column}/${row}`,
    })),
  );
  return [...horizontal, ...vertical];
}
function gridAt(raster: InventoryRaster, edge: InventoryEdge, along: number): boolean {
  const across = edge.coordinate * scale;
  return [-1, 0, 1].some((offset) =>
    gridHue(
      pixel(
        raster,
        edge.orientation === "horizontal" ? along : across + offset,
        edge.orientation === "horizontal" ? across + offset : along,
      ),
    ),
  );
}
export function assertInventoryGrid(raster: InventoryRaster, pageIndex: number): void {
  for (const edge of inventoryEdges(pageIndex)) {
    // Ignore only corner joins; require hue-separated ink along the entire interior strip.
    const start = (edge.from + 2) * scale;
    const end = (edge.to - 2) * scale;
    const midpoint = Math.floor((start + end) / 2);
    assert.ok(
      [-1, 0, 1].some((offset) => gridAt(raster, edge, midpoint + offset)),
      `Missing grid midpoint: ${edge.name}`,
    );
    let covered = 0;
    for (let along = start; along < end; along++) if (gridAt(raster, edge, along)) covered++;
    assert.ok(
      covered >= Math.ceil((end - start) * 0.95),
      `Missing grid coverage: ${edge.name} (${covered}/${end - start})`,
    );
  }
}
export function assertInventoryBackgrounds(raster: InventoryRaster, pageIndex: number): void {
  const y = (pageIndex === 0 ? 33 : 19) * scale;
  for (const x of [100 * scale, 190 * scale]) {
    for (const offset of [-1, 0, 1]) {
      const [r, g, b] = pixel(raster, x + offset, y);
      assert.ok(
        Math.abs(r - 217) <= 2 && Math.abs(g - 235) <= 2 && b === 255,
        `Missing header background: page ${pageIndex}, x ${x / scale}`,
      );
    }
  }
}
export function assertInventoryContent(raster: InventoryRaster): void {
  let text = 0;
  for (let y = 0; y < width; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixel(raster, x, y);
      if (Math.min(r, g, b) >= 250) continue;
      assert.ok(x >= 32 && x < 448 && y >= 32 && y < 448);
      if (r < 150 && r === g && g === b) text++;
    }
  }
  assert.ok(text > 100, "Missing neutral text, independently of blue grid and background");
}
export function withoutInventoryGrid(raster: InventoryRaster): InventoryRaster {
  const result = { rgb: Buffer.from(raster.rgb) };
  for (let offset = 0; offset < result.rgb.length; offset += 3) {
    const r = result.rgb[offset] ?? 255,
      g = result.rgb[offset + 1] ?? 255,
      b = result.rgb[offset + 2] ?? 255;
    if (r < 200 && r < g && g < b) result.rgb.fill(255, offset, offset + 3);
  }
  return result;
}
export function withoutInventoryEdge(raster: InventoryRaster, edge: InventoryEdge, partial = false): InventoryRaster {
  const result = { rgb: Buffer.from(raster.rgb) };
  const start = (edge.from + 2) * scale;
  const end = (edge.to - 2) * scale;
  const from = partial ? Math.ceil(start + (end - start) * 0.1) : start;
  const to = partial ? Math.floor(start + (end - start) * 0.4) : end;
  for (let along = from; along < to; along++) {
    for (const offset of [-1, 0, 1]) {
      const x = edge.orientation === "horizontal" ? along : edge.coordinate * scale + offset;
      const y = edge.orientation === "horizontal" ? edge.coordinate * scale + offset : along;
      result.rgb.fill(255, (y * width + x) * 3, (y * width + x) * 3 + 3);
    }
  }
  return result;
}
