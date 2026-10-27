import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const path = "packages/layout/src/paginator.ts";
const baseline = process.argv[2] ?? "882d6d38f432edcac97e962fbf446062c1483c3d";
const original = execFileSync("git", ["show", `${baseline}:${path}`], { encoding: "utf8" });
assert.ok(!original.includes("source-provenance.js"), `Invalid pre-provenance baseline ${baseline}: provenance import`);
let expected = original;
function replaceOnce(anchor: string, replacement: string): void {
  assert.equal(
    original.split(anchor).length - 1,
    1,
    `Invalid pre-provenance baseline ${baseline}: expected exactly one anchor ${JSON.stringify(anchor)}`,
  );
  expected = expected.replace(anchor, replacement);
}
replaceOnce(
  'import type { FlowPlacement, FlowResult, PageRegion } from "./types.js";',
  'import type { FlowPlacement, FlowResult, PageRegion } from "./types.js";\nimport { provenanceAt, provenanceRange } from "./source-provenance.js";',
);
replaceOnce('`${path}${item.sourcePaths?.[offset] ?? ""}`', "provenanceAt(item, offset, path)");
replaceOnce(
  "    this.place(\n      index,\n      fragment.height,",
  "    const provenance = provenanceRange(item, offset, fragment.nextOffset);\n    this.place(\n      provenance.index ?? index,\n      fragment.height,",
);
replaceOnce("      fragment.lines,\n      path,", "      fragment.lines,\n      provenance.path ?? path,");
replaceOnce(
  "      { start: item.sourceExtent === 0 ? 0 : offset, end: item.sourceExtent === 0 ? 0 : fragment.nextOffset },\n      item.sourceKeys?.slice(offset, fragment.nextOffset),",
  "      provenance.range,\n      provenance.keys,",
);
assert.equal(
  await readFile(path, "utf8"),
  expected,
  "Paginator edits exceeded the two provenance reporting sites/import",
);
console.log(`PASS: Paginator matches baseline ${baseline} with only the two provenance reporting sites/import changed`);
