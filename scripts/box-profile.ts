import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";

const view =
  "const view={id:n=>n.id,path:n=>'/'+n.id,style:n=>n.style??{},childCount:n=>n.children?.length??0,childAt:(n,i)=>n.children[i],content:n=>n.content};";
const scopes = {
  allocator:
    'export {resolveWidths,LayoutInputError} from "@updf/layout-kernel"; export {bits,dyadic} from "@updf/layout-kernel/numeric";',
  emptyBox: `import {layoutBoxes} from '@updf/layout-kernel/boxes'; ${view} export const layout=layoutBoxes({root:{id:'empty'},view,width:80});`,
  measuredRow: `import {layoutBoxes} from '@updf/layout-kernel/boxes'; ${view} export const layout=layoutBoxes({root:{id:'row',style:{flexDirection:'row',gap:1},children:[{id:'one',content:'Host text'},{id:'two',content:'Other text'}]},view,width:80,measure:(text,{allocation})=>({height:Math.ceil(text.length/allocation.width)})});`,
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
  assert.ok(inputs.every((path) => path.startsWith("packages/layout-kernel/dist/")));
  assert.deepEqual(metadata.imports, []);
  const retained = Object.entries(metadata.inputs).filter(([, info]) => info.bytesInOutput > 0);
  const control = scope === "allocator" ? "/width-resolver.js" : "/box-placement.js";
  assert.ok(retained.some(([path]) => path.endsWith(control)));
  const directory = new URL(`../artifacts/layout-kernel-b/standalone/${scope}/`, import.meta.url);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL("bundle.mjs", directory), output.contents);
  await writeFile(new URL("bundle.mjs.gz", directory), gzipSync(output.contents));
  await writeFile(new URL("metafile.json", directory), `${JSON.stringify(result.metafile, null, 2)}\n`);
  return {
    scope,
    raw: output.contents.length,
    gzip: gzipSync(output.contents).length,
    inputs,
    retained,
    externals: metadata.imports,
  };
}
const reports = [];
for (const [scope, contents] of Object.entries(scopes)) reports.push(await profile(scope, contents));
const [installed] = JSON.parse(
  execFileSync("npm", ["pack", "--dry-run", "--json", "./packages/layout-kernel"], { encoding: "utf8" }),
);
const report = {
  reports,
  installedPackage: {
    size: installed.size,
    unpackedSize: installed.unpackedSize,
    files: installed.files.map((file: { path: string; size: number }) => ({ path: file.path, size: file.size })),
  },
};
await writeFile(
  new URL("../artifacts/layout-kernel-b/standalone/report.json", import.meta.url),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
