import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { FlowResult } from "@updf/layout";
import { fixedAdmissionProof } from "../fixtures/fixed-admission.js";

test("direct fixed recovery PDFs pass qpdf, rasterize and preserve exact native non-overlap", async () => {
  const directory = await mkdtemp(join(tmpdir(), "updf-fixed-admission-"));
  try {
    const proofs = fixedAdmissionProof();
    assert.deepEqual(
      proofs.map((p) => p.result.pageCount),
      [1, 1, 2, 2, 1, 1, 2],
    );
    for (const [index, { result, bytes }] of proofs.entries()) {
      const pdf = join(directory, `${index}.pdf`),
        raster = join(directory, `${index}`);
      await writeFile(pdf, new Uint8Array(bytes));
      execFileSync("qpdf", ["--check", pdf]);
      assert.equal(Number(execFileSync("qpdf", ["--show-npages", pdf], { encoding: "utf8" }).trim()), result.pageCount);
      execFileSync("pdftoppm", ["-r", "72", "-f", "1", "-singlefile", pdf, raster]);
      assert.ok((await readFile(`${raster}.ppm`)).length > 0);
      assertNativeCoordinates(result);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

function assertNativeCoordinates(result: FlowResult): void {
  for (let page = 0; page < result.pageCount; page++) {
    let bottom = 0;
    for (const { box } of result.placements.filter((p) => p.pageIndex === page)) {
      assert.ok(box.y >= bottom);
      assert.ok(box.y + box.height <= result.document.pages[page]!.height);
      bottom = box.y + box.height;
    }
  }
}
