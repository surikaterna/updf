import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import test from "node:test";
import { h } from "@updf/core/vdom";
import { Document, document, Flow, flow, PageBreak, Paragraph, paragraph } from "@updf/layout";
import { layout, render } from "../fixtures/text-options.js";

function checkPdf(path: string): void {
  execFileSync("qpdf", ["--check", path]);
  assert.equal(execFileSync("qpdf", ["--show-npages", path], { encoding: "utf8" }).trim(), "5");
  assert.match(execFileSync("pdfinfo", [path], { encoding: "utf8" }), /Pages:\s+5/u);
  const pages = execFileSync("pdftotext", ["-raw", path, "-"], { encoding: "utf8" }).split("\f");
  assert.deepEqual(
    pages.map((page) => page.trim()),
    ["", "FIRST", "", "SECOND", "", ""],
  );
}

test("public PageBreak PDF has intentional blank pages and ordered text with exact data parity", async () => {
  const pageSize = { width: 200, height: 100 };
  const margins = { top: 10, right: 10, bottom: 10, left: 10 };
  const actual = layout(
    h(Document, {
      children: h(Flow, {
        pageSize,
        margins,
        children: [
          h(PageBreak, {}),
          h(Paragraph, { children: "FIRST" }),
          h(PageBreak, {}),
          h(PageBreak, {}),
          h(Paragraph, { children: "SECOND" }),
          h(PageBreak, {}),
        ],
      }),
    }),
  );
  const expected = layout(
    document({
      children: flow({
        pageSize,
        margins,
        children: [
          { type: "pageBreak" },
          paragraph({ children: "FIRST" }),
          { type: "pageBreak" },
          { type: "pageBreak" },
          paragraph({ children: "SECOND" }),
          { type: "pageBreak" },
        ],
      }),
    }),
  );
  assert.equal(actual.pageCount, 5);
  const bytes = render(actual.document);
  assert.deepEqual(bytes, render(expected.document));
  const directory = new URL("../../artifacts/page-break/", import.meta.url);
  await mkdir(directory, { recursive: true });
  const path = new URL("page-break.pdf", directory).pathname;
  await writeFile(path, bytes);
  checkPdf(path);
});
