import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { updfBaseline, verifyBaseline } from "./baseline.mjs";

function temporary(t) {
  const root = mkdtempSync(join(tmpdir(), "updf-tui-baseline-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function rejects(root) {
  assert.throws(
    () => verifyBaseline(root),
    (error) => {
      assert.ok(error.message.includes(root));
      assert.ok(error.message.includes(updfBaseline));
      assert.match(error.message, /all nine baseline source blobs/);
      assert.match(error.message, /without --baseline/);
      assert.ok(error.cause);
      return true;
    },
  );
}

test("historyless root fails with actionable historical prerequisite", (t) => {
  rejects(temporary(t));
});

test("Git checkout without the pinned revision fails", (t) => {
  const root = temporary(t);
  execFileSync("git", ["init", "--quiet", root]);
  rejects(root);
});

test("archive inside a Git parent rejects that parent's repository", (t) => {
  const root = temporary(t);
  execFileSync("git", ["init", "--quiet", root]);
  const archive = join(root, "archive");
  mkdirSync(archive);
  rejects(archive);
});
