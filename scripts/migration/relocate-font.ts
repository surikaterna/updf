import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";

const source = "experimental/declarative/fixtures/fonts/LiberationSans-Regular.ttf";
const target = "tests/fixtures/fonts/LiberationSans-Regular.ttf";
const inventory: { entries: { old: string; sha256: string }[] } = JSON.parse(
  readFileSync("docs/evidence/migration-inventory.json", "utf8"),
);
const entry = inventory.entries.find((candidate) => candidate.old === source);
assert.ok(entry);
const bytes = readFileSync(source);
assert.equal(createHash("sha256").update(bytes).digest("hex"), entry.sha256);
// The text patch tool cannot relocate binary assets. Verify before removing source.
writeFileSync(target, bytes, { flag: "wx" });
assert.deepEqual(readFileSync(target), bytes);
unlinkSync(source);
console.log(`Relocated licensed font unchanged: ${entry.sha256}`);
