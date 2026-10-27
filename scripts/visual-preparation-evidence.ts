import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";
import { visualPreparationCostInput } from "./visual-preparation-cost-input.js";

const out = process.argv[2] ?? "artifacts/visual-preparation-bridge-fixed";
await mkdir(out, { recursive: true });
const activated = [];
for (const platform of ["browser", "node"] as const) {
  for (const minify of [false, true]) {
    const result = await build({
      stdin: { contents: visualPreparationCostInput(), resolveDir: process.cwd(), loader: "ts" },
      bundle: true,
      platform,
      format: "esm",
      target: "es2022",
      minify,
      metafile: true,
      write: false,
    });
    const modules = Object.keys(result.metafile.inputs);
    assert.ok(modules.some((path) => path.endsWith("/visual-preparation.js")));
    assert.ok(modules.some((path) => path.includes("/text-flow/")));
    assert.ok(!modules.some((path) => /\/(?:images|png|jpeg|assets|fontkit|fontkite)\//u.test(path)));
    const label = `visual-${platform}-${minify ? "min" : "raw"}`;
    const output = result.outputFiles[0]!;
    await writeFile(`${out}/${label}.mjs`, output.contents);
    await writeFile(`${out}/${label}.meta.json`, JSON.stringify(result.metafile, null, 2));
    activated.push({
      label,
      bytes: output.contents.length,
      gzip: gzipSync(output.contents, { level: 9 }).length,
      parsed: modules.length,
      retained: Object.values(result.metafile.outputs).reduce(
        (sum, value) => sum + Object.values(value.inputs).filter((input) => input.bytesInOutput > 0).length,
        0,
      ),
      modules,
    });
  }
}
const shared = JSON.parse(await readFile(`${out}/shared/report.json`, "utf8"));
const before = JSON.parse(await readFile("artifacts/visual-preparation-bridge-after/shared/report.json", "utf8"));
assert.deepEqual(shared.consumers, before.consumers);
assert.deepEqual(shared.libraries, before.libraries);
const ordinaryModules = [];
for (const consumer of shared.consumers)
  assert.ok(!consumer.modules.some((path: string) => path.endsWith("/visual-preparation.js")));
for (const consumer of shared.consumers.filter((value: { label: string }) =>
  /^(?:layout|authoredRender|drawing|ordinaryText)-.*-min$/u.test(value.label),
)) {
  const prior = before.consumers.find((value: { label: string }) => value.label === consumer.label);
  ordinaryModules.push({
    label: consumer.label,
    parsed: { before: prior.modules.length, after: consumer.modules.length },
    added: consumer.modules.filter((path: string) => !prior.modules.includes(path)),
  });
}
await writeFile(
  `${out}/visual-summary.json`,
  JSON.stringify(
    {
      activated,
      ordinaryModules,
      inputSha256: createHash("sha256").update(visualPreparationCostInput()).digest("hex"),
      status:
        "corrected ordinary+float native Form/render fixture; changed input, absolute activation costs only; 312 ordinary metrics unchanged",
    },
    null,
    2,
  ),
);
console.log(activated.map(({ modules, ...cost }) => cost));
console.log(ordinaryModules);
