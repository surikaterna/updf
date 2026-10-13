import assert from "node:assert/strict";
import test from "node:test";
import { measureFontLoad } from "../../scripts/consumer/font-load-cost.js";

test("URI font loading and shared transport stay opt-in in emitted browser graphs", async () => {
  const rows = await measureFontLoad();
  assert.ok(
    rows.find((row) => row.profile === "loadedFont")!.modules.some((path) => path.endsWith("fontkit/dist/load.js")),
  );
  assert.ok(
    rows.find((row) => row.profile === "transport")!.modules.some((path) => path.endsWith("assets/dist/response.js")),
  );
});
