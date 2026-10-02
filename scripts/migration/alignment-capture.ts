import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { alignedPath, digest } from "./alignment.js";

interface Entry {
  readonly path: string;
  readonly sha256?: string;
  readonly deleted?: boolean;
}

const beforeBytes = readFileSync("artifacts/ghost-biome-before.json");
const before: { cwd: string; branch: string; head: string; status: string; entries: Entry[] } = JSON.parse(
  beforeBytes.toString("utf8"),
);
assert.equal(digest(beforeBytes), "2a82eed629e255ef1aacee0307a163d4a2ad90235ec92f90f0cccf6f6bc11500");
const entries = before.entries.map((entry) => {
  const target = alignedPath(entry.path);
  if (entry.deleted) {
    assert.ok(!existsSync(target), `Previously deleted path restored: ${target}`);
    return entry;
  }
  const afterSha256 = digest(readFileSync(target));
  if (/^(packages\/legacy|docs\/(evidence|roadmap|migration))\//u.test(entry.path)) {
    assert.equal(afterSha256, entry.sha256, `Historical/legacy file changed: ${target}`);
  }
  if (/(?:LICENSE[^/]*|REUSE\.md|\.ttf|liberation-sans\.json)$/u.test(entry.path)) {
    assert.equal(afterSha256, entry.sha256, `License/font bytes changed: ${target}`);
  }
  return { ...entry, target, afterSha256, status: afterSha256 === entry.sha256 ? "byte-identical" : "alignment-edit" };
});
writeFileSync(
  "docs/evidence/ghost-biome-history.json",
  `${JSON.stringify({ ...before, beforeInventorySha256: digest(beforeBytes), entries }, null, 2)}\n`,
  { flag: "wx" },
);
console.log(`Captured ${entries.length} pre-existing delivery paths without altering historical baselines.`);
