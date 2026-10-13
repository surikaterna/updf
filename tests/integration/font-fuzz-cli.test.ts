import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { hash } from "../../scripts/font-fuzz/check.js";
import { seeds } from "../../scripts/font-fuzz/sources.js";

test("CLI persists a reproducible finding and exits nonzero instead of claiming a partial pass", async (t) => {
  const output = await mkdtemp("/tmp/opencode/font-fuzz-cli-test-");
  t.after(() => rm(output, { recursive: true, force: true }));
  const source = seeds("fixtures")[0]!;
  assert.throws(
    () =>
      execFileSync(
        process.execPath,
        [
          "--import",
          "tsx",
          "scripts/font-fuzz/run.ts",
          "--suite",
          "fixtures",
          "--id",
          source.id,
          "--seed",
          "12345",
          "--case",
          "11",
          "--expected-sha256",
          "0".repeat(64),
          "--output",
          output,
        ],
        { cwd: process.cwd(), stdio: "pipe", timeout: 15000 },
      ),
    (error: unknown) => error instanceof Error && "status" in error && error.status === 1,
  );
  const report = JSON.parse(await readFile(join(output, "report.json"), "utf8"));
  assert.equal(report.findings, 1);
  assert.equal(report.plannedCases, 1);
  const name = `${source.id}-${source.sha256.slice(0, 12)}-v1-12345-11`;
  const receipt = JSON.parse(await readFile(join(output, `${name}.json`), "utf8"));
  assert.equal(receipt.source.sha256, source.sha256);
  assert.equal(receipt.mutationVersion, 1);
  assert.equal(receipt.artifact.sha256, hash(await readFile(join(output, receipt.artifact.file))));
  assert.match(receipt.replay, /--case 11.*--mutation-version 1.*--expected-sha256/u);
  assert.match(receipt.sequenceReplay, /--case 11 --cases 1.*--mutation-version 1/u);
});
