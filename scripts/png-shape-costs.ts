import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";
import { textFlowCostInputs } from "./text-flow-cost-inputs.js";
import { imageCacheCostInput } from "./image-cache-cost-input.js";
import { preparedImageCostInputs } from "./prepared-image-cost-inputs.js";

const out = process.argv[2];
if (!out) throw new Error("Supply a new receipt path");
const inputs = {
  ...textFlowCostInputs(),
  ...preparedImageCostInputs(),
  cached: imageCacheCostInput(),
  png: `import {preparePng,pngProvider} from '@updf/png';export const inspect=async bytes=>({resource:await preparePng(bytes),provider:pngProvider()});`,
  manualPath: `export {prepareCommands} from './packages/text-flow/dist/path-band.js';`,
};
const costs = [];
for (const [name, contents] of Object.entries(inputs)) {
  for (const minify of [false, true]) {
    const built = await build({
      stdin: { contents, resolveDir: process.cwd() },
      platform: "browser",
      format: "esm",
      target: "es2022",
      bundle: true,
      write: false,
      minify,
      metafile: true,
    });
    const bytes = built.outputFiles[0]!.contents;
    costs.push({
      name,
      minify,
      bytes: bytes.length,
      gzip: gzipSync(bytes, { level: 9 }).length,
      inputs: Object.keys(built.metafile!.inputs),
    });
  }
}
const loads = [];
for (const entry of ["@updf/png", "@updf/text-flow", "@updf/text-flow/path", "@updf/images", "@updf/images/cache"]) {
  const modules: string[] = JSON.parse(
    execFileSync(
      process.execPath,
      ["-e", `require('${entry}');console.log(JSON.stringify(Object.keys(require.cache)))`],
      { encoding: "utf8" },
    ),
  );
  const sizes = await Promise.all(modules.map(async (path) => (await readFile(path)).length));
  loads.push({ entry, modules, bytes: sizes.reduce((a, b) => a + b, 0) });
}
await writeFile(out, JSON.stringify({ costs, loads }, null, 2), { flag: "wx" });
console.log({
  profiles: Object.keys(inputs).length,
  loads: loads.map(({ entry, modules, bytes }) => ({ entry, count: modules.length, bytes })),
});
