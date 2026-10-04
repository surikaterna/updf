import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { test } from "node:test";
import { build } from "esbuild";

const fixture = `
import {render} from '@updf/core';
import {h} from '@updf/core/vdom';
import {document,flow,paragraph,span,layout,Paragraph,Span} from '@updf/layout';
const style={fontSize:10,lineHeight:1.2};
const text='FIRST\\nSECOND\\nTHIRD\\nFOURTH\\nFIFTH\\nSIXTH';
const highlight={backgroundColor:[1,1,0]};
const data=paragraph({style,whiteSpace:'preserve',children:span({style:highlight,children:text})});
const jsx=h(Paragraph,{style,whiteSpace:'preserve',children:h(Span,{style:highlight,children:text})});
const wrap=children=>document({children:flow({pageSize:{width:100,height:36},margins:{top:6,right:6,bottom:6,left:6},children})});
export const result=layout(wrap(data));
export const bytes=render(result.document);
export const jsxBytes=render(layout(wrap(jsx)).document);
`;
async function paragraphFixture(control: boolean) {
  const result = await build({
    stdin: { contents: fixture, resolveDir: process.cwd() },
    bundle: true,
    write: false,
    format: "esm",
    platform: "neutral",
    plugins: control
      ? [
          {
            name: "pre-C-selector-control",
            setup(builder) {
              builder.onLoad({ filter: /packages\/layout\/dist\/content-producer\.js$/ }, () => ({
                contents: execFileSync(
                  "git",
                  ["show", "cb719c2e709f0d2ee2dc79773fb093c9ce17650a:packages/layout/src/content-producer.ts"],
                  { encoding: "utf8" },
                ),
                loader: "ts",
              }));
            },
          },
        ]
      : [],
  });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0]!.contents).toString("base64")}`);
}
test("C production multipage authored paragraph matches pre-C paint/fit bytes, TSX and real PDF line order", async () => {
  const current = await paragraphFixture(false),
    control = await paragraphFixture(true);
  assert.deepEqual(current.bytes, control.bytes);
  assert.deepEqual(current.bytes, current.jsxBytes);
  assert.equal(current.result.pageCount, 3);
  assert.deepEqual(
    current.result.placements.map((placement: { lines?: { start: number; end: number } }) => placement.lines),
    [
      { start: 0, end: 2 },
      { start: 2, end: 4 },
      { start: 4, end: 6 },
    ],
  );
  await mkdir("artifacts/layout-kernel-c", { recursive: true });
  const path = "artifacts/layout-kernel-c/paragraph.pdf";
  await writeFile(path, current.bytes);
  execFileSync("qpdf", ["--check", path]);
  const extracted = execFileSync("pdftotext", ["-layout", path, "-"], { encoding: "utf8" });
  assert.deepEqual(extracted.match(/FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH/gu), [
    "FIRST",
    "SECOND",
    "THIRD",
    "FOURTH",
    "FIFTH",
    "SIXTH",
  ]);
  execFileSync("pdftoppm", ["-r", "72", "-png", path, "artifacts/layout-kernel-c/paragraph"]);
});
