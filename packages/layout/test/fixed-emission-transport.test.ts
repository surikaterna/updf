import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, type NodeDefinition, render } from "@updf/core";
import { h } from "@updf/core/vdom";
import { Block, createExtensions, defineBlockAdapter, extension, layoutFlow, Paragraph } from "@updf/layout";
import { flow } from "./fixtures.js";

test("F-AUD01 R2 generic fixed transport retains owned recipes without a table-specific branch", () => {
  let calls = 0;
  function Header() {
    calls++;
    return h(Paragraph, { children: "FIXED_HEAD" });
  }
  const adapter = defineBlockAdapter({
    name: "audit.fixed-transport",
    validate: (input) => input,
    measure(_props, context) {
      const measured = context.measureContent(
        h(Block, {
          children: [
            h(Block.Header, { height: 12, children: h(Header, {}) }),
            h(Paragraph, { children: "FIXED_BODY" }),
          ],
        }),
        { width: context.width },
      );
      assert.ok(Object.isFrozen(measured.nodes));
      const decorations = context.reserveDecorations([
        {
          edge: "before",
          repeat: "first",
          height: measured.size.height,
          content: { type: "fixed", height: measured.size.height, children: measured.nodes },
        },
      ]);
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: context.width, height: 0 },
        decorations,
        fragment: () => ({ status: "placed", nextOffset: 1, height: 0, nodes: [] }),
      };
    },
  });
  const result = layoutFlow(flow([extension(adapter, {})], { height: 100 }), {}, createExtensions([adapter]));
  assert.equal(calls, 1);
  assert.match(new TextDecoder().decode(render(result.document)), /FIXED_HEAD/u);
});
test("F-AUD01 R2 generic fixed unowned data still rejects malformed schemas/getters and optional quotas", () => {
  let reads = 0;
  const malformed = Object.defineProperty({}, "type", {
    enumerable: true,
    get() {
      reads++;
      return "paintGroup";
    },
  });
  assert.throws(
    () => layoutFlow(flow([{ type: "fixed", height: 20, children: [malformed as NodeDefinition] }])),
    (error: unknown) => error instanceof DocumentError,
  );
  assert.equal(reads, 0);
  const children = [
    {
      type: "text" as const,
      x: 0,
      y: 0,
      width: 80,
      height: 12,
      fontSize: 10,
      lineHeight: 12,
      align: "left" as const,
      text: "ABC",
    },
  ];
  assert.throws(
    () =>
      layoutFlow(flow([{ type: "fixed", height: 20, children }]), {
        profile: "service",
        limits: { textCodePoints: 2 },
      }),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "LIMIT",
  );
});
