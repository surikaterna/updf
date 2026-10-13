import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";

const renderer = "import {render} from '@updf/core';import {h,lower} from '@updf/core/vdom';";
const document = (node: string) =>
  `export const pdf=value=>render(lower(h('document',{version:1,children:h('page',{width:2000,height:1000,children:${node}})})));`;

export const profiles = {
  core: renderer + document("h('rect',{x:0,y:0,width:20,height:20})"),
  code39: renderer + "import {Code39} from '@updf/barcodes/code39';" + document("h(Code39,{value,x:10,y:10})"),
  qr: renderer + "import {QRCode} from '@updf/barcodes/qr';" + document("h(QRCode,{value,x:10,y:10})"),
  code39Geometry: "export {code39} from '@updf/barcodes/code39';",
  qrGeometry: "export {qrCode} from '@updf/barcodes/qr';",
};

export async function barcodeProfile(name: keyof typeof profiles) {
  const result = await build({
    stdin: { contents: profiles[name], resolveDir: process.cwd(), sourcefile: `${name}.ts`, loader: "ts" },
    platform: "browser",
    conditions: ["browser"],
    target: "es2022",
    format: "esm",
    bundle: true,
    minify: true,
    write: false,
    metafile: true,
  });
  const output = result.outputFiles[0]!;
  const modules = Object.keys(result.metafile.inputs);
  assert.ok(
    !modules.some((path) =>
      /packages\/(?:svg|fonts|fontkit|fontkite|layout|jpeg|png)\/|node_modules\/(?:@zxing|jsqr)\//u.test(path),
    ),
  );
  assert.ok(!modules.some((path) => /packages\/[^/]+\/src\/|\/dist\/(?:cjs|node)\//u.test(path)));
  const qr = modules.some((path) => /node_modules\/qrcode-generator\//u.test(path));
  assert.equal(qr, name.startsWith("qr"));
  if (name === "core") assert.ok(!modules.some((path) => /packages\/barcodes\//u.test(path)));
  return { name, raw: output.contents.length, gzip: gzipSync(output.contents).length, modules, code: output.text };
}
