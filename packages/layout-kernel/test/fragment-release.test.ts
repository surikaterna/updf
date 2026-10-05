import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

test("retained closed/poisoned operations and handles release host buffers in isolated GC child", () => {
  const child = spawnSync(
    process.execPath,
    ["--expose-gc", "--import", "tsx", fileURLToPath(new URL("./fragment-release-child.ts", import.meta.url))],
    { encoding: "utf8", timeout: 15000 },
  );
  assert.equal(child.error, undefined);
  assert.equal(child.status, 0, child.stderr || child.stdout);
});
