import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { test } from "node:test";
import { certifyControlSource, controlSource, paragraphFixture } from "./kernel-paragraph-control.js";

const fixture = `
import {render} from '@updf/core';
import {createHelvetica,fontProvider,fontRuntime} from '@updf/fonts';
import {createTextService} from '@updf/text';
import {h} from '@updf/core/vdom';
import {document,flow,paragraph,span,layout,Paragraph,Span} from '@updf/layout';
const style={fontSize:10,lineHeight:1.2};
const runtime=fontRuntime();
const options={resources:{Helvetica:createHelvetica()},text:createTextService({runtime,defaultFont:'Helvetica'}),providers:[fontProvider(runtime)]};
const text='FIRST\\nSECOND\\nTHIRD\\nFOURTH\\nFIFTH\\nSIXTH';
const highlight={backgroundColor:[1,1,0]};
const data=paragraph({style,whiteSpace:'preserve',children:span({style:highlight,children:text})});
const jsx=h(Paragraph,{style,whiteSpace:'preserve',children:h(Span,{style:highlight,children:text})});
const wrap=children=>document({children:flow({pageSize:{width:100,height:36},margins:{top:6,right:6,bottom:6,left:6},children})});
export const result=layout(wrap(data),options);
export const bytes=render(result.document,options);
export const jsxBytes=render(layout(wrap(jsx),options).document,options);
`;
test("C production multipage authored paragraph matches pre-C paint/fit bytes, TSX and real PDF line order", async () => {
  const current = await paragraphFixture(fixture),
    control = await paragraphFixture(fixture, await controlSource());
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
  await mkdir("artifacts/layout-boxes-c", { recursive: true });
  const path = "artifacts/layout-boxes-c/paragraph.pdf";
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
  execFileSync("pdftoppm", ["-r", "72", "-png", path, "artifacts/layout-boxes-c/paragraph"]);
});

test("pre-C paragraph control rejects byte mutation and executes the historical producer body", async () => {
  const source = await controlSource();
  assert.throws(() => certifyControlSource(`${source} `), /pre-C source certificate/u);
  const sentinel = "PRE_C_PARAGRAPH_PRODUCER_EXECUTED";
  const mutated = source.replace("\n  return {", `\n  throw new Error('${sentinel}');\n  return {`);
  assert.notEqual(mutated, source);
  // In-memory fault injection only: the pinned fixture and production module stay untouched.
  await assert.rejects(paragraphFixture(fixture, mutated), { message: sentinel });
});
