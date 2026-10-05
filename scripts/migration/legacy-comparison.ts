import { readFileSync } from "node:fs";
import { compareLegacy } from "./legacy-equivalence.js";

const before = process.argv[2];
const after = process.argv[3];
if (!before || !after) throw new Error("Usage: legacy-comparison.ts BEFORE.json AFTER.json");
const baseline: unknown = JSON.parse(readFileSync(before, "utf8"));
const candidate: unknown = JSON.parse(readFileSync(after, "utf8"));
const rawResults: unknown = JSON.parse(readFileSync("docs/evidence/legacy-raw-results.json", "utf8"));
compareLegacy(baseline, candidate, rawResults);
console.log("Legacy baseline equivalent. This is not a passing raw legacy test gate.");
