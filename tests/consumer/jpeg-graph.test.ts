import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { costInputs, hostCostInput, jpegCostInputs } from "../../scripts/consumer/cost-inputs.js";

test("emitted browser cost graphs isolate JPEG, with retained parser positive control", async () => {
  const inputs = { ...costInputs(false), measurementHost: hostCostInput(false, true), ...jpegCostInputs() };
  for (const [profile, contents] of Object.entries(inputs)) {
    const result = await build({
      stdin: { contents, resolveDir: process.cwd(), loader: "ts" },
      bundle: true,
      minify: true,
      target: "es2022",
      platform: "browser",
      conditions: ["browser"],
      format: "esm",
      metafile: true,
      write: false,
    });
    const parsed = Object.keys(result.metafile.inputs);
    const retained = Object.values(result.metafile.outputs).flatMap((output) =>
      Object.entries(output.inputs)
        .filter(([, value]) => value.bytesInOutput > 0)
        .map(([path]) => path),
    );
    assert.ok(!parsed.some((path) => /packages\/[^/]+\/(?:src|dist\/(?:cjs|node))\//u.test(path)));
    if (!profile.startsWith("jpeg")) assert.ok(!parsed.some((path) => /packages\/jpeg\//u.test(path)), profile);
    else
      assert.ok(
        retained.some((path) => /jpeg\/dist\/parser\.js$/u.test(path)),
        profile,
      );
    if (profile === "jpeg") assert.ok(!parsed.some((path) => /packages\/(?:fonts|text)\//u.test(path)));
    if (profile !== "fontkit") assert.ok(!parsed.some((path) => /node_modules\/fontkit\//u.test(path)));
    assert.ok(!parsed.some((path) => /(?:pngjs|jpeg-js|sharp)\//u.test(path)));
  }
});
