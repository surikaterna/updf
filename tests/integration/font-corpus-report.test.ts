import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { prepareFont } from "@updf/fontkite";
import { fixture } from "../../packages/fontkite/test/helpers.js";
import { compare, differences, passed } from "../../scripts/font-corpus/compare.js";
import { corpus } from "../../scripts/font-corpus/manifest.js";
import { options, selected } from "../../scripts/font-corpus/options.js";
import { validateCorpus } from "../../scripts/font-corpus/types.js";

test("corpus pins 21 fonts and their licenses, separating supported and unsupported suites", () => {
  validateCorpus(corpus);
  assert.equal(corpus.length, 21);
  assert.equal(selected(corpus, "static-smoke").length, 19);
  assert.equal(selected(corpus, "unsupported").length, 2);
  assert.equal(new Set(corpus.map((item) => item.license.sha256)).size, 9);
  assert.throws(() => validateCorpus([corpus[0]!, corpus[0]!]));
  assert.throws(() => selected(corpus, "all", "missing"));
  for (const args of [[], ["--offline", "--suite", "typo"], ["--offline", "--offline"], ["--offline", "--id"]])
    assert.throws(() => options(args, "test"));
  assert.throws(() => options(["--offline"], "fetch"));
  assert.equal(options(["--offline", "--suite", "all"], "test").suite, "all");
});

test("differential reporting preserves mismatches and does not count arbitrary rejection as success", async () => {
  const bytes = await fixture();
  assert.equal(compare(bytes, { kind: "supported" }).status, "match");
  const rejected = {
    kind: "unsupported",
    code: "FONT_FORMAT",
    message: "Truncated or invalid TrueType range",
    reason: "synthetic truncation",
  } as const;
  assert.equal(compare(new Uint8Array([1]), rejected).status, "expected-rejection");
  assert.equal(compare(bytes, rejected).status, "unexpected-acceptance");
  assert.equal(compare(new Uint8Array([1]), { ...rejected, code: "FONT_RIGHTS" }).status, "unexpected-rejection");
  assert.equal(compare(new Uint8Array([1]), { kind: "supported" }).status, "unexpected-rejection");
  const metadata = prepareFont(bytes).metadata;
  const changed = {
    ...metadata,
    glyphs: metadata.glyphs.map((glyph, i) => (i ? glyph : { ...glyph, advance: glyph.advance + 1 })),
  };
  const result = differences(changed, metadata);
  assert.equal(result.status, "mismatch");
  assert.equal(result.glyphDifferenceCount, 1);
  assert.equal(result.glyphDifferences?.length, 1);
  for (const status of [
    "mismatch",
    "worker-error",
    "cache-error",
    "reference-error",
    "unexpected-rejection",
    "unexpected-acceptance",
  ])
    assert.equal(passed(status), false);
});

test("offline corpus CLI fails missing assets and writes an actionable report instead of skipping", async (t) => {
  const root = await mkdtemp("/tmp/opencode/font-corpus-report-test-");
  t.after(() => rm(root, { recursive: true, force: true }));
  const output = join(root, "report.json");
  assert.throws(
    () =>
      execFileSync(
        process.execPath,
        ["--import", "tsx", "scripts/font-corpus/report.ts", "--offline", "--id", "lato-regular", "--output", output],
        { cwd: process.cwd(), env: { ...process.env, UPDF_FONT_CORPUS_CACHE: root }, stdio: "pipe", timeout: 15000 },
      ),
    (error: unknown) => error instanceof Error && "status" in error && error.status === 1,
  );
  const report = JSON.parse(await readFile(output, "utf8"));
  assert.equal(report.selected, 1);
  assert.equal(report.failures, 1);
  assert.equal(report.results[0].status, "cache-error");
});
