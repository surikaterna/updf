import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { destination } from "./destinations.js";
import { compareLegacy } from "./legacy-equivalence.js";
import { check, entries } from "./preservation.js";
import { reconcile } from "./reconciliation.js";

test("preservation inventory accounts for all relocated originals and protects roadmap/assets/legacy bytes", () => {
  assert.equal(reconcile("docs/evidence/migration-inventory.json").total, 293);
});

test("destination rules retain distinct legacy, native, examples, tests and historical configs", () => {
  const cases: Readonly<Record<string, string>> = {
    "src/index.js": "packages/legacy/src/index.js",
    "index.js": "packages/legacy/index.js",
    ".babelrc": "packages/legacy/.babelrc",
    "readme.md": "docs/migration/legacy-readme.md",
    "experimental/declarative/core/schema.ts": "packages/core/src/core/schema.ts",
    "experimental/declarative/geometry/LICENSE.svgpath": "packages/geometry/LICENSE.svgpath",
    "experimental/declarative/svg/tree.ts": "packages/svg/src/tree.ts",
    "experimental/declarative/fontkit/api.d.ts": "packages/fontkit/src/api.d.ts",
    "experimental/declarative/examples/cmr-types.ts": "apps/cmr/src/cmr-types.ts",
    "experimental/declarative/fixtures/fonts/LICENSE": "tests/fixtures/fonts/LICENSE",
    "experimental/declarative/fixtures/font-browser/browser.test.ts": "tests/browser/browser-fonts.test.ts",
    "experimental/declarative/test/probes/css-budget.ts": "packages/svg/test/probes/css-budget.ts",
    "experimental/declarative/test/types/vdom-template.tsx": "tests/consumer/types/vdom-template.tsx",
    "experimental/declarative/package-lock.json": "docs/evidence/baseline/poc-package-lock.json",
    "experimental/declarative/roadmap/README.md": "docs/roadmap/README.md",
  };
  for (const [old, target] of Object.entries(cases)) assert.equal(destination(old), target);
});

test("unclassified inputs fail rather than silently losing files", () => {
  assert.throws(() => destination("foreign.txt"), /Unclassified legacy/u);
  assert.throws(() => destination("experimental/declarative/new-unknown.txt"), /Unclassified POC/u);
  assert.throws(() => destination("experimental/declarative/examples/new.ts"), /Unclassified example/u);
});

test("preservation detects same-size byte changes and invalid inventories", () => {
  const original = new Uint8Array([1, 2, 3]);
  const entry = { old: "fixture", bytes: 3, sha256: createHash("sha256").update(original).digest("hex") };
  check(entry, original);
  assert.throws(() => check(entry, new Uint8Array([1, 2, 4])), /Changed original/u);
  assert.throws(() => check(entry, new Uint8Array([1, 2])), /Changed original/u);
  assert.throws(() => entries(null), /Invalid preservation/u);
  assert.throws(() => entries({ entries: {}, generated: [] }), /Invalid entry lists/u);
  assert.throws(
    () => entries({ entries: [{ old: 1, bytes: 3, sha256: "x" }], generated: [] }),
    /Invalid preservation/u,
  );
});

test("comparison fails on changed outcomes, failures, output bytes, runtime and harness failure", () => {
  const run = { exit: 1, signal: null, error: null };
  const baseline = {
    raw: run,
    full: run,
    fullResults: { failed: ["known"] },
    outputFiles: { full: [{ sha256: "known" }] },
    node: "v24",
  };
  compareLegacy(baseline, baseline);
  assert.throws(() => compareLegacy(baseline, { ...baseline, raw: { ...run, exit: 0 } }));
  assert.throws(() => compareLegacy(baseline, { ...baseline, fullResults: { failed: ["other"] } }));
  assert.throws(() => compareLegacy(baseline, { ...baseline, outputFiles: {} }));
  assert.throws(() => compareLegacy(baseline, { ...baseline, node: "v25" }));
  assert.throws(() => compareLegacy(baseline, { ...baseline, full: { ...run, signal: "SIGTERM" } }));
  assert.throws(() => compareLegacy(baseline, { ...baseline, full: { ...run, error: "missing mocha" } }));
});
