import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { paragraph as authored } from "@updf/layout";
import { createLayoutOperation } from "../../../tests/fixtures/text-options.js";
import type { ParagraphFragments } from "../dist/cjs/paragraph-fragments.js";
import { layout } from "../dist/cjs/layout.js";
import { flow, paragraph } from "./fixtures.js";

const require = createRequire(import.meta.url);
test("actual layout failure closes the paragraph selection owner on raw and rich branches", () => {
  const module = require("../dist/cjs/paragraph-fragments.js");
  const original = module.paragraphFragments;
  const bindings: ParagraphFragments[] = [];
  module.paragraphFragments = (...args: Parameters<typeof original>) => {
    const binding = original(...args);
    bindings.push(binding);
    return binding;
  };
  try {
    for (const raw of [true, false]) {
      const operation = createLayoutOperation({});
      try {
        const block = raw
          ? { type: "paragraph" as const, paragraph: paragraph("A\nB\nC"), keepTogether: true }
          : authored({ children: "A\nB\nC", whiteSpace: "preserve", keepTogether: true });
        assert.throws(() => layout({ ...flow([], { height: 1 }), body: [block] }, operation), /exceeds|fit|oversized/i);
        const binding = bindings.at(-1)!;
        assert.ok(binding);
        assert.throws(
          () =>
            binding.operation.prepare({
              id: "closed",
              path: "/closed",
              descriptor: { measured: { lines: [], height: 0 }, keep: false },
              extent: 1,
              mode: "splittable",
              width: { mode: "fixed", value: 80 },
            }),
          /closed/,
        );
      } finally {
        operation.close();
      }
    }
    assert.equal(bindings.length, 2);
  } finally {
    module.paragraphFragments = original;
  }
});
test("retaining only a closed binding releases rich descriptor callback resources", () => {
  const producerPath = require.resolve("../dist/cjs/content-producer.js");
  const bindingPath = require.resolve("../dist/cjs/paragraph-fragments.js");
  const child = spawnSync(
    process.execPath,
    [
      "--expose-gc",
      "-e",
      `
    const assert = require('node:assert/strict');
    const { contentProducer } = require(${JSON.stringify(producerPath)});
    const { paragraphFragments, closeParagraphFragments } = require(${JSON.stringify(bindingPath)});
    const lifetime = { active: true }, binding = paragraphFragments(lifetime);
    const weak = (() => {
      const resource = { bytes: new Uint8Array(1024) };
      contentProducer({ lines: [], height: 0, backgroundCount: () => 0,
        emissionCounts: () => ({ nodes: 0, text: 0, commands: 0, work: 0 }),
        paintLine: () => { resource.bytes[0] = 1; return []; }
      }, 80, false, '/release', binding);
      return new WeakRef(resource);
    })();
    async function collect() { for (let i = 0; i < 12; i++) { await new Promise(setImmediate); global.gc(); } }
    (async () => {
      await collect(); assert.ok(weak.deref());
      closeParagraphFragments(lifetime);
      await collect(); assert.equal(weak.deref(), undefined);
      assert.equal(binding.operation.counts().sourceReads, 1);
    })().catch(error => { console.error(error); process.exitCode = 1; });
  `,
    ],
    { encoding: "utf8" },
  );
  assert.equal(child.status, 0, child.stderr);
});
