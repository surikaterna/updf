import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { render } from "@updf/core";
import { cmrFixture, createCmrDocument } from "@updf/example-cmr/cmr";
import { build } from "esbuild";
import { freightInvoiceExample } from "../examples/business/freight-invoice.js";
import { freightFonts } from "../tests/fixtures/fonts/freight-fonts.js";

const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const result = await build({
  stdin: {
    contents:
      'import { render } from "@updf/core"; export const pdf = render({version:1,pages:[{width:100,height:100,children:[{type:"text",x:10,y:10,width:80,height:20,text:"Kernel baseline",fontSize:10,lineHeight:12,align:"left"}]}]});',
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  metafile: true,
  format: "esm",
  platform: "neutral",
  minify: true,
});
const bytes = result.outputFiles[0]?.contents;
if (!bytes) throw new Error("Missing bundle");
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bytes).toString("base64")}`);
console.log(
  JSON.stringify(
    {
      core: {
        raw: bytes.length,
        gzip: gzipSync(bytes).length,
        sha256: hash(bytes),
        pdfSha256: hash(runtime.pdf),
        graph: Object.keys(result.metafile.inputs).sort(),
      },
      pdf: {
        cmr: hash(render(createCmrDocument(cmrFixture))),
        rows: hash(await readFile("artifacts/rows/geometry.pdf")),
        freight: hash(freightInvoiceExample(await freightFonts()).bytes),
      },
    },
    null,
    2,
  ),
);
