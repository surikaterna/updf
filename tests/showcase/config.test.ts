import assert from "node:assert/strict";
import test from "node:test";
import { resolveConfig } from "vite";

test("Vite uses the Pages project base by default and permits only safe custom directory bases", async () => {
  const configFile = new URL("../../apps/showcase/vite.config.ts", import.meta.url).pathname;
  const original = process.env.SHOWCASE_BASE;
  try {
    delete process.env.SHOWCASE_BASE;
    assert.equal((await resolveConfig({ configFile }, "build")).base, "/updf/");
    for (const base of ["/", "/custom-site/"]) {
      process.env.SHOWCASE_BASE = base;
      assert.equal((await resolveConfig({ configFile }, "build")).base, base);
    }
    for (const base of ["https://example.com/", "/../", "/no-trailing-slash", "//host/"]) {
      process.env.SHOWCASE_BASE = base;
      await assert.rejects(resolveConfig({ configFile, logLevel: "silent" }, "build"), /SHOWCASE_BASE/);
    }
  } finally {
    if (original === undefined) delete process.env.SHOWCASE_BASE;
    else process.env.SHOWCASE_BASE = original;
  }
});
