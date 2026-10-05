import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { DocumentDefinition, NodeDefinition } from "@updf/core";
import { h } from "@updf/core/vdom";
import { Block, document, flow, paragraph } from "@updf/layout";
import { layout, render } from "../fixtures/text-options.js";

test("#51 unchanged native groups match an independently translated control PDF, bbox and ink", async () => {
  const content = paragraph({ style: { font: "Helvetica", fontSize: 9, lineHeight: 1.4 }, children: "hello hello" });
  const margins = { top: 0, right: 0, bottom: 0, left: 0 };
  const baseline = layout(
    document({ children: flow({ pageSize: { width: 25, height: 25.2 }, margins, children: content }) }),
  );
  const children = Array.from(baseline.document.pages[0]?.children ?? []).map((node): NodeDefinition => {
    if (node.type !== "paintGroup") assert.fail("Expected the control line group");
    return { ...node, transform: [1, 0, 0, 1, 6, 6 + (node.transform?.[5] ?? 0)] };
  });
  const control: DocumentDefinition = {
    version: 1,
    pages: [{ width: 37, height: 37.2, children: [{ type: "paintGroup", transform: [1, 0, 0, 1, 0, 0], children }] }],
  };
  const actual = layout(
    document({
      children: flow({
        pageSize: { width: 37, height: 37.2 },
        margins,
        children: h(Block, { style: { padding: 6 }, children: content }),
      }),
    }),
  );
  assert.deepEqual(actual.document, control);
  assert.deepEqual(render(actual.document), render(control));
  const directory = await mkdtemp(join(tmpdir(), "updf51-pdf-"));
  const results = [];
  for (const [name, pdf] of [
    ["actual", actual.document],
    ["control", control],
  ] as const) {
    const path = join(directory, `${name}.pdf`);
    await writeFile(path, render(pdf));
    execFileSync("qpdf", ["--check", path]);
    const bbox = execFileSync("pdftotext", ["-bbox", path, "-"], { encoding: "utf8" });
    const text = execFileSync("pdftotext", [path, "-"], { encoding: "utf8" });
    assert.equal(text.match(/hello/g)?.length, 2);
    execFileSync("pdftoppm", ["-r", "144", "-singlefile", path, join(directory, name)]);
    results.push({ bbox, ink: await readFile(join(directory, `${name}.ppm`)) });
  }
  assert.deepEqual(results[0], results[1]);
});
