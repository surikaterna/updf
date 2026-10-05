import assert from "node:assert/strict";
import { test } from "node:test";
import { paragraph } from "@updf/layout";
import { createLayoutOperation } from "../../../tests/fixtures/text-options.js";
import { prepareLeaf } from "../dist/cjs/blocks.js";
import { OutputBudget } from "../dist/cjs/budget.js";
import { authorParagraph, normalizeBlocks } from "../dist/cjs/content-normalize.js";
import { measureParagraph } from "../dist/cjs/content-paragraph.js";
import { contentProducer } from "../dist/cjs/content-producer.js";
import type { ExtensionLifetime } from "../dist/cjs/extension-producer.js";
import { closeParagraphFragments } from "../dist/cjs/paragraph-fragments.js";

const request = { availableHeight: 12, atFreshRegion: true, offset: 0, width: 80, freshHeight: 12, usedHeight: 0 };
test("production authored paragraphs and repeated candidate trials share one nonforked work ledger", () => {
  const operation = createLayoutOperation({});
  const lifetime: ExtensionLifetime = { active: true };
  const values = normalizeBlocks(
    [
      paragraph({ children: "A\nB\nC", whiteSpace: "preserve", style: { lineHeight: 1 } }),
      paragraph({ children: "D", style: { lineHeight: 1 } }),
    ],
    operation,
    "/body",
  );
  const one = prepareLeaf(values[0], 80, "/one", operation, undefined, lifetime);
  const two = prepareLeaf(values[1], 80, "/two", operation, undefined, lifetime);
  const budget = new OutputBudget(operation.policy);
  one.fragment({ ...request, budget: budget.fork() });
  one.fragment({ ...request, budget: budget.fork() });
  two.fragment({ ...request, budget: budget.fork() });
  const counts = lifetime.paragraphFragments!.operation.counts();
  assert.equal(counts.attempts, 3);
  assert.equal(counts.sourceReads, 2);
  assert.equal(counts.measurements, 5);
  assert.equal(counts.outputFragments, 3);
  assert.deepEqual(budget.totals(), { nodes: 0, text: 0, commands: 0, work: 0 });
  closeParagraphFragments(lifetime);
  assert.throws(() => one.fragment(request), /closed/);
  operation.close();
});
test("prepared native paragraph counts match final emission and fit trials never paint native text", () => {
  const operation = createLayoutOperation({});
  const normalized = normalizeBlocks(
    paragraph({ children: "A\nB", whiteSpace: "preserve", style: { lineHeight: 1 } }),
    operation,
    "/body",
  )[0]!;
  const measured = measureParagraph(authorParagraph(normalized)!, 80, operation, undefined, "/body");
  let paints = 0;
  const producer = contentProducer(
    {
      ...measured,
      paintLine: (...args) => {
        paints++;
        return measured.paintLine(...args);
      },
    },
    80,
    false,
    "/body",
  );
  const selected = producer.fragment({ ...request, budget: new OutputBudget(operation.policy) })!;
  producer.fragment({ ...request, budget: new OutputBudget(operation.policy) });
  assert.equal(paints, 0);
  const actual = selected.paint({ x: 0, y: 0, start: (offset) => offset, budget: new OutputBudget(operation.policy) });
  assert.equal(paints, 2);
  const budget = new OutputBudget(operation.policy);
  budget.charge(actual, "/body");
  assert.deepEqual(budget.totals(), measured.emissionCounts(0));
  operation.close();
});
