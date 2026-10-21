import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { createDrawingLayoutOperation } from "@updf/core/internal-drawing";
import { block, document, fixed, flow, layout } from "@updf/layout";
import { prepareLeaf } from "../dist/blocks.js";
import type { ExtensionLifetime } from "../dist/extension-producer.js";
import { frameFits } from "../dist/selection-request.js";

const request = { offset: 0, width: 10, usedHeight: 0, freshHeight: 2, availableHeight: 2, atFreshRegion: true };

test("resolved frames use one capacity predicate, including zero, complete, and exhausted requests", () => {
  assert.equal(frameFits(request, 2), true);
  assert.equal(frameFits(request, 3), false);
  assert.equal(frameFits({ ...request, usedHeight: 1, availableHeight: 1 }, 2), false);
  assert.equal(frameFits({ ...request, freshHeight: 0, availableHeight: 0 }, 0), true);
  assert.equal(frameFits({ mode: "complete", offset: 0, width: 10 }, 3), true);
  assert.equal(frameFits({ mode: "complete", offset: 1, width: 10 }, 3), false);
  assert.equal(frameFits({ ...request, freshHeight: 0.3, usedHeight: 0.1, availableHeight: 0.2 }, 0.2), true);
});

test("fixed/spacer refusal precedes reservation and does not allocate a paragraph metric owner", () => {
  const operation = createDrawingLayoutOperation({});
  const lifetime: ExtensionLifetime = { active: true };
  try {
    for (const value of [
      { type: "fixed", height: 2, children: [] },
      { type: "spacer", height: 2 },
    ]) {
      const prepared = prepareLeaf(value, 10, "/frame", operation, undefined, lifetime);
      let reservations = 0;
      const reserve = {
        apply: () => {
          reservations++;
          return 2;
        },
      };
      assert.equal(prepared.fragment({ ...request, freshHeight: 1, availableHeight: 1, reserve }), undefined);
      assert.equal(reservations, 0);
      assert.equal(prepared.fragment({ ...request, reserve })!.height, 2);
      assert.equal(reservations, 1);
      assert.equal(lifetime.paragraphFragments, undefined);
    }
  } finally {
    operation.close();
  }
});

function large(kept: boolean, count: number, pages?: number) {
  return layout(
    document({
      children: flow({
        pageSize: { width: 100, height: 1000 },
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        children: Array.from({ length: count }, () => {
          const child = fixed({ height: 1, children: [] });
          return kept ? block({ keepTogether: true, children: [child] }) : child;
        }),
      }),
    }),
    pages === undefined ? {} : { limits: { pages } },
  );
}

test("large resolved-frame documents retain capacity while explicit page limits still apply", () => {
  assert.equal(large(false, 11000).pageCount, 11);
  assert.equal(large(true, 5100).pageCount, 6);
  assert.throws(
    () => large(false, 11000, 10),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "LIMIT",
  );
});

test("resolved-frame producers delegate fit instead of registering kernel sources", () => {
  for (const name of ["blocks", "container-producer", "row-producer"]) {
    const source = readFileSync(new URL(`../src/${name}.ts`, import.meta.url), "utf8");
    assert.match(source, /frameFits\(request, height\)/);
    assert.doesNotMatch(source, /frameSelection/);
  }
});
