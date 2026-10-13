import assert from "node:assert/strict";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";

const profiles = {
  pngExports: `export {preparePng,png,pngProvider} from '@updf/png';`,
  pngPdf: `import {render} from '@updf/core';import {preparePng,png,pngProvider} from '@updf/png';
    export async function pdf(bytes){const image=await preparePng(bytes);return render({version:1,pages:[{width:100,height:100,children:[png('image',{x:0,y:0,width:100,height:100})]}]},{resources:{image},providers:[pngProvider()]});}`,
};
async function measure(root: string, baseline = false) {
  const rows = [];
  for (const [profile, contents] of Object.entries(profiles)) {
    const result = await build({
      stdin: { contents, resolveDir: root },
      bundle: true,
      minify: true,
      target: "es2022",
      platform: "browser",
      conditions: ["browser"],
      format: "esm",
      write: false,
      metafile: true,
    });
    const modules = Object.keys(result.metafile.inputs);
    assert.ok(!modules.some((path) => /packages\/[^/]+\/(?:src|dist\/(?:node|cjs))\//u.test(path)));
    if (!baseline) assert.ok(!modules.some((path) => /node_modules\/(?:fflate|pako|tiny-inflate)\//u.test(path)));
    const bytes = result.outputFiles[0]!.contents;
    rows.push({ profile, raw: bytes.length, gzip: gzipSync(bytes, { level: 9 }).length });
  }
  return rows;
}
const current = await measure(process.cwd());
const baseline = process.argv[2] ? await measure(resolve(process.argv[2]), true) : [];
console.table(
  current.map((row) => ({ ...row, beforeGzip: baseline.find((old) => old.profile === row.profile)?.gzip })),
);
