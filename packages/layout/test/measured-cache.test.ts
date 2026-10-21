import assert from "node:assert/strict";
import test from "node:test";
import { type BlockUnitRequest, createExtensions, defineBlockAdapter, document, extension, flow } from "@updf/layout";
import { validateDataObject } from "@updf/core/internal";
import { createLayoutOperation, layout } from "../../../tests/fixtures/text-options.js";
import { withAdapter } from "../dist/cjs/adapter-ancestors.js";
import { extensionProducer, type ExtensionLifetime } from "../dist/cjs/extension-producer.js";
import { leafCache } from "../dist/cjs/leaf-cache.js";
import { closeMeasuredSources } from "../dist/cjs/measured-source.js";

test("public document flow invokes an unbound strict next with no retained engine receiver", () => {
  const receivers: unknown[] = [];
  function next(this: unknown, query: BlockUnitRequest) {
    receivers.push(this);
    assert.equal(this, undefined);
    assert.ok(Object.isFrozen(query));
    assert.deepEqual(Object.keys(query).sort(), ["extent", "offset", "width"]);
    assert.deepEqual(query, { offset: 0, extent: 1, width: 80 });
    return { end: 1, height: 1, nodes: [] };
  }
  const adapter = defineBlockAdapter({
    name: "unit.receiver",
    validate: (input) => input,
    measure: () => ({ fragmentation: "atomic", extent: 1, naturalSize: { width: 80, height: 1 }, next }),
  });
  const result = layout(
    document({
      children: flow({
        pageSize: { width: 80, height: 2 },
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        extensions: createExtensions([adapter]),
        children: [extension(adapter, {})],
      }),
    }),
  );
  assert.equal(result.pageCount, 1);
  assert.equal(result.placements[0]?.box.height, 1);
  assert.deepEqual(receivers, [undefined]);
});

function recordingAdapter(measurements: [number, readonly string[]][], calls: [number, string][]) {
  return defineBlockAdapter({
    name: "unit.cache",
    validate: (input) => input,
    measure(_props, context) {
      measurements.push([context.width, context.ancestors]);
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: 1, height: 999 },
        next(query) {
          calls.push([query.width, context.sourcePath]);
          return { end: 1, height: 0, nodes: [] };
        },
      };
    },
  });
}
test("semantic measurements cache exact width and ancestry, but bind each occurrence's next origin", () => {
  const measurements: [number, readonly string[]][] = [];
  const calls: [number, string][] = [];
  const adapter = recordingAdapter(measurements, calls);
  const descriptor = extension(adapter, {});
  validateDataObject(descriptor, ["type", "props"], "/descriptor");
  const extensions = createExtensions([adapter]);
  const operation = createLayoutOperation({});
  const lifetime: ExtensionLifetime = { active: true };
  const cache = leafCache();
  const prepare = (width: number, path: string) =>
    extensionProducer(descriptor, width, path, operation, extensions, lifetime, cache);
  try {
    const first = prepare(80, "/first"),
      second = prepare(80, "/second");
    assert.notEqual(first, second);
    const request = { width: 80, offset: 0, freshHeight: 0, usedHeight: 0, availableHeight: 0, atFreshRegion: true };
    first.fragment(request);
    second.fragment(request);
    prepare(80 + Number.EPSILON * 80, "/width");
    withAdapter(operation, "parent", () => prepare(80, "/nested"));
    assert.deepEqual(measurements, [
      [80, []],
      [80 + Number.EPSILON * 80, []],
      [80, ["parent"]],
    ]);
    assert.deepEqual(calls, [
      [80, "/first"],
      [80, "/second"],
    ]);
  } finally {
    lifetime.active = false;
    closeMeasuredSources(lifetime);
    operation.close();
  }
});
