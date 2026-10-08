import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";

const scopes = {
  fragmentation: 'export {createFragmentOperation} from "@updf/layout-boxes/fragmentation";',
  boxesAndFragmentation:
    'export {createFragmentOperation} from "@updf/layout-boxes/fragmentation"; export {layoutBoxes} from "@updf/layout-boxes/boxes";',
};
async function profile(scope: string, contents: string) {
  const result = await build({
    stdin: { contents, resolveDir: process.cwd() },
    bundle: true,
    write: false,
    metafile: true,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    minify: true,
  });
  const output = result.outputFiles[0],
    metadata = Object.values(result.metafile.outputs)[0];
  assert.ok(output && metadata);
  const inputs = Object.keys(result.metafile.inputs).filter((path) => path !== "<stdin>");
  assert.ok(inputs.every((path) => path.startsWith("packages/layout-boxes/dist/")));
  assert.deepEqual(metadata.imports, []);
  const retained = Object.entries(metadata.inputs).filter(([, info]) => info.bytesInOutput > 0);
  assert.ok(retained.some(([path]) => path.endsWith("/fragment-select.js")));
  assert.ok(retained.some(([path]) => path.endsWith("/box-placement.js")));
  const directory = new URL(`../artifacts/layout-boxes-c/${scope}/`, import.meta.url);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL("bundle.mjs", directory), output.contents);
  await writeFile(new URL("metafile.json", directory), `${JSON.stringify(result.metafile, null, 2)}\n`);
  return {
    scope,
    raw: output.contents.length,
    gzip: gzipSync(output.contents).length,
    retained,
    externals: metadata.imports,
  };
}
const reports = [];
for (const [scope, contents] of Object.entries(scopes)) reports.push(await profile(scope, contents));
await writeFile(
  new URL("../artifacts/layout-boxes-c/report.json", import.meta.url),
  `${JSON.stringify(reports, null, 2)}\n`,
);
console.log(JSON.stringify(reports, null, 2));
