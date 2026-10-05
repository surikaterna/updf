import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { destination } from "./destinations.js";
import { compareLegacy } from "./legacy-equivalence.js";
import { focusHarness, legacyReporter } from "./legacy-focus-harness.js";
import { check, entries } from "./preservation.js";
import { reconcile } from "./reconciliation.js";

test("preservation inventory accounts for all relocated originals and protects roadmap/assets/legacy bytes", () => {
  const result = reconcile("docs/evidence/migration-inventory.json");
  assert.equal(result.total, 293);
  const writer = result.entries.find((entry) => entry.old === "experimental/declarative/core/bytes.ts");
  assert.equal(writer?.new, "packages/core/src/core/pdf-writer.ts");
  assert.equal(writer?.status, "migration-edit-review-required");
  assert.ok(
    result.entries
      .filter((entry) => /^(src|test)\//u.test(entry.old))
      .every((entry) => entry.status === "relocated-byte-identical"),
  );
  assert.equal(
    result.entries.find((entry) => entry.old === "experimental/declarative/eslint.config.ts")?.new,
    "docs/evidence/baseline/retired-root-eslint.config.ts.txt",
  );
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

test("active dependency graph contains no retired tooling", () => {
  const lock: { packages: Record<string, unknown> } = JSON.parse(readFileSync("package-lock.json", "utf8"));
  const prohibited =
    /(?:^|\/)node_modules\/(?:@babel\/|@eslint\/|@eslint-community\/|babel(?:-|\/|$)|eslint(?:-|\/|$)|typescript-eslint(?:\/|$)|mocha(?:\/|$)|prettier(?:\/|$))/u;
  assert.deepEqual(
    Object.keys(lock.packages).filter((path) => prohibited.test(path)),
    [],
  );
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
  const focused = { passed: [], pending: [], failed: ["known"] };
  compareLegacy(baseline, { ...baseline, rawResults: focused }, focused);
  assert.throws(() => compareLegacy(baseline, { ...baseline, rawResults: {} }, focused));
  assert.throws(() => compareLegacy(baseline, { ...baseline, raw: { ...run, exit: 0 } }));
  assert.throws(() => compareLegacy(baseline, { ...baseline, fullResults: { failed: ["other"] } }));
  assert.throws(() => compareLegacy(baseline, { ...baseline, outputFiles: {} }));
  assert.throws(() => compareLegacy(baseline, { ...baseline, node: "v25" }));
  assert.throws(() => compareLegacy(baseline, { ...baseline, full: { ...run, signal: "SIGTERM" } }));
  assert.throws(() => compareLegacy(baseline, { ...baseline, full: { ...run, error: "missing runner" } }));
});

test("bounded Node adapter preserves focus, pending suites, callbacks and failure messages", () => {
  const dir = mkdtempSync("/tmp/opencode/updf-adapter-test-");
  mkdirSync(join(dir, "test"));
  writeFileSync(join(dir, "package.json"), '{"type":"commonjs"}');
  writeFileSync(join(dir, "focus-harness.cjs"), focusHarness);
  writeFileSync(join(dir, "reporter.cjs"), legacyReporter);
  writeFileSync(
    join(dir, "test", "fixture.js"),
    `
describe('suite', () => {
  it('callback', done => setImmediate(done));
  it.only('focused', () => { throw Object.assign(new Error('known'), { name: 'AssertionError' }); });
  xdescribe('pending', () => it('never runs', () => { throw new Error('must not execute'); }));
});
`,
  );
  function run(full: string) {
    const env: NodeJS.ProcessEnv = { ...process.env, UPDF_LEGACY_FULL: full };
    delete env.NODE_TEST_CONTEXT;
    const result = spawnSync(process.execPath, ["--test", "--test-reporter=./reporter.cjs", "focus-harness.cjs"], {
      cwd: dir,
      encoding: "utf8",
      timeout: 10000,
      env,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /test:fail: suite focused/u);
    if (full) {
      assert.match(result.stdout, /test:pass: suite callback/u);
      assert.match(result.stdout, /test:skip: suite pending never runs/u);
      assert.doesNotMatch(result.stdout, /test:pass: suite pending never runs/u);
    } else assert.doesNotMatch(result.stdout, /suite pending never runs/u);
    return JSON.parse(readFileSync(join(dir, "full-result.json"), "utf8"));
  }
  const failed = [{ title: "suite focused", name: "AssertionError", message: "known" }];
  assert.deepEqual(run(""), { passed: [], pending: [], failed });
  assert.deepEqual(run("1"), { passed: ["suite callback"], pending: ["suite pending never runs"], failed });
});
