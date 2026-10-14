import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { fractionalSVG } from "../fixtures/svg-fractional.js";

test("fractional direct/nested SVG PDFs preserve both colored targets at a native-certified page edge", async () => {
  const directory = await mkdtemp("/tmp/opencode/updf-svg-fractional-");
  try {
    const rasters: Buffer[] = [];
    for (const nested of [false, true]) {
      const path = join(directory, `${nested}.pdf`);
      const result = fractionalSVG(nested);
      assert.equal(result.pageCount, 1);
      await writeFile(path, result.bytes);
      execFileSync("qpdf", ["--check", path], { stdio: "pipe" });
      const ppm = execFileSync("pdftoppm", ["-r", "720", "-singlefile", path]);
      const header = /^P6\s+400\s+800\s+255\s/u.exec(ppm.subarray(0, 80).toString("ascii"));
      assert.ok(header);
      const rgb = ppm.subarray(header[0].length);
      const pixel = (x: number, y: number) => [...rgb.subarray((y * 400 + x) * 3, (y * 400 + x) * 3 + 3)];
      assert.deepEqual(pixel(100, 100), [255, 0, 0]);
      assert.deepEqual(pixel(100, 790), [0, 0, 255]);
      assert.deepEqual(pixel(250, 790), [255, 255, 255]);
      rasters.push(rgb);
    }
    assert.deepEqual(rasters[0], rasters[1]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
