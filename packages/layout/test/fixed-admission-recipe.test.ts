import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createDrawingLayoutOperation } from "@updf/core/internal-drawing";
import { h, useContext } from "@updf/core/vdom";
import {
  Block,
  createExtensions,
  defineBlockAdapter,
  extension,
  FragmentContext,
  type FragmentInfo,
  type MeasuredContent,
  PageContext,
  type PageInfo,
} from "@updf/layout";
import { render, textOptions } from "../../../tests/fixtures/text-options.js";
import { prepare } from "../dist/cjs/blocks.js";
import { OutputBudget } from "../dist/cjs/budget.js";
import { finalizeDecorations } from "../dist/cjs/deferred-decoration.js";
import { Paginator } from "../dist/cjs/paginator.js";
import { template } from "../dist/cjs/template.js";
import { flow } from "./fixtures.js";

function recipeFixture() {
  const calls: { page: PageInfo; fragment: FragmentInfo }[] = [];
  function Header() {
    calls.push({ page: useContext(PageContext), fragment: useContext(FragmentContext) });
    return h("rect", { x: 0, y: 0, width: 1, height: 0.1, paint: { fill: [1, 0, 0], stroke: null } });
  }
  let measured: MeasuredContent | undefined;
  const adapter = defineBlockAdapter({
    name: "fixed.admission-recipe",
    validate: (input) => input,
    measure(_props, context) {
      measured = context.measureContent(
        h(Block, { children: h(Block.Header, { height: 0.2, children: h(Header, {}) }) }),
        { width: context.width },
      );
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: measured.size,
        fragment: () => ({ status: "placed", nextOffset: 1, height: 0, nodes: [] }),
      };
    },
  });
  return { calls, adapter, measured: () => measured };
}

test("real measured deferred recipe survives direct fixed refusal and finalizes once on the accepted page", async () => {
  const fixture = recipeFixture();
  const operation = createDrawingLayoutOperation(textOptions({}));
  try {
    prepare(extension(fixture.adapter, {}), 100, "/measure", operation, createExtensions([fixture.adapter]));
    const measured = fixture.measured();
    assert.ok(measured);
    assert.equal(measured.size.height, 0.2);
    assert.deepEqual(fixture.calls, []);
    const budget = new OutputBudget(operation.policy);
    const paginator = new Paginator(template(flow([], { height: 0.3 }).pageTemplate, operation), operation.policy, {
      budget,
      reservePage: () => {},
    });
    paginator.consume(prepare({ type: "fixed", height: 0.1, children: [] }, 100, "/body/0", operation), 0);
    const fixed = prepare({ type: "fixed", height: 0.2, children: measured.nodes }, 100, "/body/1", operation);
    assert.ok(0.1 + 0.2 > 0.3);
    assert.ok(
      fixed.fragment({
        offset: 0,
        usedHeight: 0.1,
        availableHeight: 0.3 - 0.1,
        freshHeight: 0.3,
        atFreshRegion: false,
        width: 100,
      }),
    );
    paginator.consume(fixed, 1);
    const result = paginator.result(2);
    assert.equal(result.pageCount, 2);
    assert.deepEqual(result.placements[1], {
      sourceIndex: 1,
      sourcePath: "/body/1",
      pageIndex: 1,
      box: { x: 0, y: 0, width: 100, height: 0.2 },
      sourceRange: { start: 0, end: 1 },
    });
    // Recipes execute at sealed finalization, not selection or accepted paint.
    assert.deepEqual(fixture.calls, []);
    const document = finalize(result.document, operation, budget);
    assert.deepEqual(fixture.calls, [{ page: pageInfo(1), fragment: { index: 0, count: 1, first: true, last: true } }]);
    operation.validateDocument(document);
    await checkPdf(render(document));
    assert.equal(fixture.calls.length, 1);
  } finally {
    operation.close();
  }
});

function pageInfo(index: number): PageInfo {
  return {
    docPageNumber: index + 1,
    docPageCount: 2,
    sectionNumber: 1,
    flow: { index: 0, pageNumber: index + 1, pageCount: 2 },
  };
}

function finalize(
  document: Parameters<typeof render>[0],
  operation: ReturnType<typeof createDrawingLayoutOperation>,
  budget: OutputBudget,
) {
  return {
    ...document,
    pages: document.pages.map((page, index) => ({
      ...page,
      children: finalizeDecorations(page.children, pageInfo(index), operation, budget),
    })),
  };
}

async function checkPdf(bytes: Uint8Array): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "updf-fixed-recipe-"));
  try {
    const pdf = join(directory, "recipe.pdf");
    await writeFile(pdf, bytes);
    execFileSync("qpdf", ["--check", pdf]);
    assert.equal(execFileSync("qpdf", ["--show-npages", pdf], { encoding: "utf8" }).trim(), "2");
    execFileSync("pdftoppm", ["-r", "72", "-f", "2", "-singlefile", pdf, join(directory, "accepted")]);
    assert.ok((await readFile(join(directory, "accepted.ppm"))).length > 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
