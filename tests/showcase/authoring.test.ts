import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import type { NodeDefinition } from "@updf/core";
import ts from "typescript";
import { flowDefaults, flowExample } from "../../apps/showcase/src/flow.js";
import { textDemo } from "../../apps/showcase/src/text.js";
import { pdf, rendered, settledModule, site, source } from "./helpers.js";

test("primary TSX demos author real layout components, not renamed drawing intrinsics", async () => {
  for (const name of ["template", "flow", "blocks", "rich", "mixed"]) {
    const code = await readFile(new URL(`../../apps/showcase/src/${name}.tsx`, import.meta.url), "utf8");
    const tree = ts.createSourceFile(`${name}.tsx`, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const tags: string[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) tags.push(node.tagName.getText(tree));
      ts.forEachChild(node, visit);
    };
    visit(tree);
    assert.ok(tags.includes("Document") && tags.includes("Flow") && tags.includes("Paragraph"), name);
    assert.ok(
      tags.every((tag) => /^[A-Z]/u.test(tag)),
      `${name}: native drawing belongs in explicit helpers`,
    );
    assert.doesNotMatch(code, /layoutFlow|pageTemplate|"@updf\/layout\/vdom"/u);
  }
});

function textContent(nodes: readonly NodeDefinition[]): string {
  return nodes
    .map((node) => {
      if (node.type === "richText")
        return node.paragraphs.flatMap((paragraph) => paragraph.runs.map((run) => run.text)).join("");
      return "children" in node ? textContent(node.children) : "";
    })
    .join("\n");
}
test("flow reserves non-overlapping regions and renders final page counts, with regions optional", () => {
  const { result, authoredParagraphCount } = flowExample("Report");
  assert.equal(authoredParagraphCount, 6);
  assert.equal(result.pageCount, 3);
  result.document.pages.forEach((page, index) => {
    const text = textContent(page.children);
    assert.match(text, /UPDF flow header/u);
    assert.ok(text.includes(`Repeated footer ${index + 1}/${result.pageCount}`));
  });
  for (const placement of result.placements) {
    assert.ok(placement.box.y >= 40);
    assert.ok(placement.box.y + placement.box.height <= 200);
  }
  const plain = flowExample("Report", { ...flowDefaults, regions: false });
  assert.doesNotMatch(
    textContent(plain.result.document.pages.flatMap((page) => page.children)),
    /Repeated footer|flow header/u,
  );
});

test("lazy template failures retain the last PDF and cancelled imports cannot install stale output", async () => {
  const app = await site();
  let release: (() => void) | undefined;
  try {
    const page = await app.browser.newPage();
    await page.route("**/assets/template-*.js", (route) => route.abort());
    await page.goto(app.url);
    await pdf(page);
    await page.getByLabel("Example", { exact: true }).selectOption("template");
    await page.getByRole("button", { name: "Generate PDF" }).click();
    await page
      .getByRole("status")
      .filter({ hasText: /Generation failed/u })
      .waitFor();
    assert.deepEqual(await pdf(page), textDemo("Hello portable PDF"));
    const delayed = await app.browser.newPage();
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await delayed.route("**/assets/template-*.js", async (route) => {
      await gate;
      await route.continue();
    });
    await delayed.goto(app.url);
    const request = delayed.waitForRequest("**/assets/template-*.js");
    await delayed.getByLabel("Example", { exact: true }).selectOption("template");
    await delayed.getByRole("button", { name: "Generate PDF" }).click();
    await delayed.getByLabel("Example", { exact: true }).selectOption("text");
    release?.();
    await settledModule(delayed, request);
    assert.deepEqual(await pdf(delayed), textDemo("Hello portable PDF"));
    await rendered(delayed);
    await source(delayed, "text.ts");
  } finally {
    release?.();
    await app.close();
  }
});
