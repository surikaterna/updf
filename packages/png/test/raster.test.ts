import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { render } from "@updf/core";
import { pngProvider, preparePng } from "@updf/png";
import { document, fixture } from "./helpers.js";

test("qpdf/Poppler confirm color orientation and full/partial/zero alpha over white", async () => {
  const directory = mkdtempSync(join(tmpdir(), "updf-png-"));
  try {
    const path = join(directory, "image.pdf");
    writeFileSync(
      path,
      render(document(), { resources: { image: await preparePng(fixture()) }, providers: [pngProvider()] }),
    );
    execFileSync("qpdf", ["--check", path]);
    const ppm = execFileSync("pdftoppm", ["-r", "72", "-singlefile", path]);
    const header = /^P6\s+(\d+)\s+(\d+)\s+255\s/u.exec(ppm.toString("latin1"));
    assert.ok(header);
    assert.equal(Number(header[1]), 100);
    assert.equal(Number(header[2]), 100);
    const pixels = ppm.subarray(header[0].length);
    for (const [x, y, expected] of [
      [20, 30, [255, 0, 0]],
      [55, 30, [127, 255, 127]],
      [20, 50, [255, 255, 255]],
      [55, 50, [255, 255, 0]],
    ] as const) {
      const actual = pixels.subarray((y * 100 + x) * 3, (y * 100 + x) * 3 + 3);
      assert.ok(
        expected.every((value, index) => Math.abs(value - actual[index]!) <= 2),
        `${x},${y}: ${[...actual]}`,
      );
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
