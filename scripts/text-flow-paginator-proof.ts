import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const path = "packages/layout/src/paginator.ts";
const original = execFileSync("git", ["show", `HEAD:${path}`], { encoding: "utf8" });
const expected = original
  .replace(
    'import type { FlowPlacement, FlowResult, PageRegion } from "./types.js";',
    'import type { FlowPlacement, FlowResult, PageRegion } from "./types.js";\nimport { provenanceAt, provenanceRange } from "./source-provenance.js";',
  )
  .replace('`${path}${item.sourcePaths?.[offset] ?? ""}`', "provenanceAt(item, offset, path)")
  .replace(
    "    this.place(\n      index,\n      fragment.height,",
    "    const provenance = provenanceRange(item, offset, fragment.nextOffset);\n    this.place(\n      provenance.index ?? index,\n      fragment.height,",
  )
  .replace("      fragment.lines,\n      path,", "      fragment.lines,\n      provenance.path ?? path,")
  .replace(
    "      { start: item.sourceExtent === 0 ? 0 : offset, end: item.sourceExtent === 0 ? 0 : fragment.nextOffset },\n      item.sourceKeys?.slice(offset, fragment.nextOffset),",
    "      provenance.range,\n      provenance.keys,",
  );
assert.equal(
  await readFile(path, "utf8"),
  expected,
  "Paginator edits exceeded the two provenance reporting sites/import",
);
console.log(
  "PASS: Paginator admission/cursor/selection/preparation/paint/state/control ordering is byte-identical to HEAD",
);
