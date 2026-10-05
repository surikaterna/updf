import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { render } from "@updf/core";
import { cmrFixture, createCmrDocument } from "@updf/example-cmr/cmr";
import { build } from "esbuild";
import { freightInvoiceExample } from "../examples/business/freight-invoice.js";
import { freightFonts } from "../tests/fixtures/fonts/freight-fonts.js";
import { arithmeticControl, arithmeticSource } from "./layout-kernel-control.js";

const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const baseline = process.argv.includes("--baseline");
const rows = await readFile("artifacts/rows/geometry.pdf").catch((cause: unknown) => {
  throw new Error("Missing artifacts/rows/geometry.pdf prerequisite: run npm run build and npm test first", { cause });
});
const control = baseline ? arithmeticControl(await arithmeticSource()) : undefined;
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
  plugins: control ? [control.plugin] : [],
});
const controlMetadata = control?.assertApplied(result.metafile);
const bytes = result.outputFiles[0]?.contents;
if (!bytes) throw new Error("Missing bundle");
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bytes).toString("base64")}`);
const directory = new URL(`../artifacts/layout-kernel-b/core-${baseline ? "before" : "after"}/`, import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL("bundle.mjs", directory), bytes);
await writeFile(new URL("bundle.mjs.gz", directory), gzipSync(bytes));
await writeFile(new URL("metafile.json", directory), `${JSON.stringify(result.metafile, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      control: controlMetadata,
      core: {
        raw: bytes.length,
        gzip: gzipSync(bytes).length,
        sha256: hash(bytes),
        pdfSha256: hash(runtime.pdf),
        graph: Object.keys(result.metafile.inputs).sort(),
      },
      pdf: {
        cmr: hash(render(createCmrDocument(cmrFixture))),
        rows: hash(rows),
        freight: hash(freightInvoiceExample(await freightFonts()).bytes),
      },
    },
    null,
    2,
  ),
);
