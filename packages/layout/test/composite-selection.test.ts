import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { createDrawingLayoutOperation } from "@updf/core/internal-drawing";
import { block, column, createExtensions, defineBlockAdapter, extension, row } from "@updf/layout";
import { compile } from "../dist/cjs/block-compiler.js";
import type { ExtensionLifetime } from "../dist/cjs/extension-producer.js";
import { closeMeasuredSources } from "../dist/cjs/measured-source.js";
import { closeParagraphFragments } from "../dist/cjs/paragraph-fragments.js";

const request = { offset: 0, width: 100, usedHeight: 0, freshHeight: 3, availableHeight: 3, atFreshRegion: true };

function fixture(kind: "row" | "closed") {
  const operation = createDrawingLayoutOperation({});
  const lifetime: ExtensionLifetime = { active: true };
  const widths: number[] = [];
  const adapter = defineBlockAdapter({
    name: "composite.unit",
    validate: () => ({}),
    measure: (_props, context) => ({
      naturalSize: { width: context.width, height: 2 },
      fragmentation: "atomic",
      extent: 1,
      next: (query) => {
        widths.push(query.width);
        return { end: 1, height: 2, nodes: [] };
      },
    }),
  });
  const child = extension(adapter, {});
  const input =
    kind === "row"
      ? row({ style: { width: 40 }, children: [column({ width: 20, children: [child] })] })
      : block({ keepTogether: true, style: { width: 40 }, children: [child] });
  const prepared = compile([input], 100, "/body", {
    operation,
    lifetime,
    freshHeight: 3,
    extensions: createExtensions([adapter]),
  })[0]!;
  return {
    prepared,
    widths,
    lifetime,
    close() {
      lifetime.active = false;
      closeParagraphFragments(lifetime);
      closeMeasuredSources(lifetime);
      operation.close();
    },
  };
}

test("resolved composite refusal precedes descendant queries without registering a metric source", () => {
  for (const kind of ["row", "closed"] as const) {
    const f = fixture(kind);
    try {
      assert.equal(f.lifetime.paragraphFragments, undefined);
      assert.equal(
        f.prepared.fragment({ ...request, usedHeight: 2, availableHeight: 1, atFreshRegion: false }),
        undefined,
      );
      assert.deepEqual(f.widths, []);
      assert.equal(f.prepared.fragment(request)!.height, 2);
      assert.deepEqual(f.widths, [kind === "row" ? 20 : 40]);
      assert.equal(f.lifetime.paragraphFragments, undefined);
    } finally {
      f.close();
    }
    assert.throws(() => f.prepared.fragment(request), /closed/);
  }
});

test("composite geometry still rejects authored widths beyond the host", () => {
  for (const kind of ["row", "closed"] as const) {
    const f = fixture(kind);
    try {
      const operation = createDrawingLayoutOperation({});
      try {
        const input =
          kind === "row"
            ? row({ style: { width: 101 }, children: [] })
            : block({ keepTogether: true, style: { width: 101 }, children: [] });
        assert.throws(
          () =>
            compile([input], 100, "/body", {
              operation,
              lifetime: f.lifetime,
              freshHeight: 3,
            }),
          DocumentError,
        );
      } finally {
        operation.close();
      }
      assert.deepEqual(f.widths, []);
    } finally {
      f.close();
    }
  }
});

test("Row retains its fresh-region diagnostic after frame refusal; complete queries still succeed", () => {
  const f = fixture("row");
  try {
    assert.throws(
      () => f.prepared.fragment({ ...request, freshHeight: 1, availableHeight: 1 }),
      (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "VERTICAL_OVERFLOW",
    );
    assert.deepEqual(f.widths, []);
    assert.equal(f.prepared.fragment({ mode: "complete", offset: 0, width: 100 })!.height, 2);
    assert.deepEqual(f.widths, [20]);
  } finally {
    f.close();
  }
});
