import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { checkSeams } from "../../../scripts/boundaries.js";

test("text extraction has no core facade or reverse font/text edges", async () => {
  const root = new URL("../../../", import.meta.url);
  await checkSeams(fileURLToPath(root));
  const manifest = JSON.parse(await readFile(new URL("packages/core/package.json", root), "utf8"));
  assert.equal(manifest.exports["./measurement"], undefined);
  for (const path of [
    "core/fixed-text.ts",
    "measurement/index.ts",
    "measurement/measure.ts",
    "measurement/wrap.ts",
    "measurement/validate.ts",
    "measurement/source.ts",
    "measurement/inline-paint.ts",
  ])
    await assert.rejects(stat(new URL(`packages/core/src/${path}`, root)), { code: "ENOENT" });
  const text = JSON.parse(await readFile(new URL("packages/text/package.json", root), "utf8"));
  assert.deepEqual(Object.keys(text.dependencies).sort(), ["@updf/core", "@updf/layout-kernel"]);
});
