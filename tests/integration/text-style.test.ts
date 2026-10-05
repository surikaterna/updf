import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { document, flow, paragraph, pt } from "@updf/layout";
import { layout, render } from "../fixtures/text-options.js";

function pdf(height: number, top: number, text = "A") {
  return render(
    layout(
      document({
        children: flow({
          pageSize: { width: 100, height: 100 },
          margins: { top, right: 10, bottom: 10, left: 10 },
          children: paragraph({ style: { fontSize: 12, lineHeight: pt(height), color: [1, 0, 0] }, children: text }),
        }),
      }),
    ).document,
  );
}
test("#49-B public tight line height paints the identical full glyph raster at a shared baseline", () => {
  const normal = pdf(12, 20);
  const tight = pdf(4, 24);
  const raster = (input: Uint8Array) => execFileSync("pdftoppm", ["-r", "144", "-singlefile", "-"], { input });
  assert.deepEqual(raster(tight), raster(normal));
  assert.match(execFileSync("pdftotext", ["-", "-"], { input: tight, encoding: "utf8" }), /A/u);
  const overlapping = pdf(4, 24, "A\nA");
  assert.equal(
    (execFileSync("pdftotext", ["-raw", "-", "-"], { input: overlapping, encoding: "utf8" }).match(/A/gu) ?? []).length,
    2,
  );
  assert.throws(() => pdf(4, 0));
});
