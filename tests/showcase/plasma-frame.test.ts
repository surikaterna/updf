import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import test from "node:test";
import { plasmaPDF, plasmaSVG } from "../../apps/showcase/src/plasma/frame.js";

test("deterministic opaque vector plasma changes with phase and yields valid single-page PDFs", async () => {
  const svg = plasmaSVG(0);
  assert.equal(svg, plasmaSVG(0));
  assert.notEqual(svg, plasmaSVG(25));
  assert.equal((svg.match(/<rect /g) ?? []).length, 640);
  assert.equal((svg.match(/fill="#[0-9a-f]{6}"/g) ?? []).length, 640);
  assert.ok(!/image|opacity|filter/.test(svg));
  assert.throws(() => plasmaSVG(-1));
  const first = plasmaPDF(0);
  assert.deepEqual(first, plasmaPDF(0));
  assert.notDeepEqual(first, plasmaPDF(25));
  const directory = new URL("../../artifacts/showcase/", import.meta.url);
  await mkdir(directory, { recursive: true });
  for (const index of [0, 25]) {
    const file = new URL(`plasma-${index}.pdf`, directory).pathname;
    await writeFile(file, plasmaPDF(index));
    assert.match(execFileSync("qpdf", ["--check", file], { encoding: "utf8" }), /No syntax or stream encoding errors/);
    assert.match(execFileSync("pdfinfo", [file], { encoding: "utf8" }), /Pages:\s+1/);
    assert.match(execFileSync("pdfinfo", [file], { encoding: "utf8" }), /320 x 200 pts/);
  }
});
