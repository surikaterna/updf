import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DocumentError, type TextNode } from "@updf/core";
import { cmrFixture, createCmrDocument } from "@updf/example-cmr/cmr";
import { render } from "../fixtures/text-options.js";

test("CMR named subset dimensions, exact anchors and supplied goods total", () => {
  const ast = createCmrDocument(cmrFixture);
  const page = ast.pages[0];
  assert.ok(page);
  assert.deepEqual([page.width, page.height], [595, 842]);
  const rects = page.children.filter((node) => node.type === "rect");
  assert.deepEqual(
    rects.slice(0, 10).map(({ x, y, width, height }) => [x, y, width, height]),
    [
      [40, 64, 257.5, 64],
      [297.5, 64, 257.5, 64],
      [40, 128, 257.5, 63],
      [297.5, 128, 257.5, 63],
      [40, 191, 257.5, 63],
      [297.5, 191, 257.5, 63],
      [40, 254, 257.5, 63],
      [297.5, 254, 257.5, 63],
      [40, 317, 257.5, 83],
      [297.5, 317, 257.5, 83],
    ],
  );
  assert.deepEqual(
    rects.slice(10, 18).map((node) => node.width),
    [84.375, 44.375, ...Array(6).fill(64.375)],
  );
  assert.ok(rects.slice(10, 18).every((node) => node.y === 400 && node.height === 102));
  assert.deepEqual(
    rects.slice(18).map((node) => [node.y, node.height]),
    [
      [502, 99],
      [502, 33],
      [535, 33],
      [568, 33],
    ],
  );
  const texts = page.children
    .filter((node) => node.type === "text")
    .map((node) => node.text)
    .join("\n");
  for (const anchor of ["1. Sender", "10. Reservations", "BOX-A", "BOX-B", "Total: 200 kg", "22. Delivery conditions"])
    assert.ok(texts.includes(anchor));
  assert.deepEqual(createCmrDocument(cmrFixture), ast);
  assert.ok(render(ast).length < 100 * 1024);
  assert.equal(
    createHash("sha256").update(render(ast)).digest("hex"),
    "8316f7de647590dbfad97a7dff0aac7dd6dbde1ff98cbdff544387ca59c49a22",
  );
  assert.throws(() => render(createCmrDocument({ ...cmrFixture, sender: "Москва" })), DocumentError);
});

test("independent parser handles shared multipage nodes and literal injection strings", async () => {
  const directory = await mkdtemp(join(tmpdir(), "declarative-literals-"));
  const path = join(directory, "literal.pdf");
  const literal = "Literal (parens) \\ slash /Name endstream 0 obj";
  const child = Object.freeze({
    type: "text",
    x: 10,
    y: 10,
    width: 500,
    height: 20,
    text: literal,
    fontSize: 10,
    lineHeight: 12,
    align: "left",
  } satisfies TextNode);
  const page = Object.freeze({ width: 595, height: 842, children: Object.freeze([child]) });
  try {
    await writeFile(path, render({ version: 1, pages: [page, page, page] }));
    execFileSync("qpdf", ["--check", path]);
    assert.match(execFileSync("pdfinfo", [path], { encoding: "utf8" }), /Pages:\s+3/);
    const extracted = execFileSync("pdftotext", ["-layout", path, "-"], { encoding: "utf8" });
    assert.equal(extracted.split(literal).length - 1, 3);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("independent qpdf/poppler parse, extract supplied text and verify page size", async () => {
  const directory = await mkdtemp(join(tmpdir(), "declarative-cmr-"));
  const path = join(directory, "cmr.pdf");
  try {
    await writeFile(path, render(createCmrDocument(cmrFixture)));
    assert.match(
      execFileSync("qpdf", ["--check", path], { encoding: "utf8" }),
      /No syntax or stream encoding errors found/,
    );
    assert.match(execFileSync("pdfinfo", [path], { encoding: "utf8" }), /595 x 842 pts/);
    const extracted = execFileSync("pdftotext", ["-layout", path, "-"], { encoding: "utf8" });
    for (const anchor of [
      "North Goods AB",
      "BOX-A",
      "BOX-B",
      "Total: 200 kg",
      "Experimental CMR subset - not operational",
    ])
      assert.ok(extracted.includes(anchor));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
