import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { createPreparingDrawingOperation } from "@updf/core/internal-preparation";
import { createExtensions, defineBlockAdapter, extension } from "@updf/layout";
import type { MeasuredBlock } from "@updf/layout";
import { extensionProducer } from "../dist/cjs/extension-producer.js";
import { lifetimeLeafCache } from "../dist/cjs/leaf-cache.js";
import { publishVisualReference, readVisualReference } from "../dist/cjs/visual-reference.js";
import { visualContentHeight } from "../dist/cjs/visual-content-height.js";
import type { ExtensionLifetime } from "../dist/cjs/extension-producer.js";

test("measured-cache and checkedMeasured forward exact request reports without another measure or paint", () => {
  const stage = createPreparingDrawingOperation({});
  const operation = stage.operation;
  const lifetime: ExtensionLifetime = { active: true };
  let calls = 0;
  const adapter = defineBlockAdapter({
    name: "ReferenceTest",
    validate: () => ({}),
    measure(_props, context) {
      calls++;
      const height = visualContentHeight(context);
      return publishVisualReference(
        context,
        {
          fragmentation: "atomic" as const,
          extent: 1,
          naturalSize: { width: context.width, height },
          next: () => assert.fail("Reading a reference must not select or paint"),
        },
        Object.freeze({ x: 0, y: 0, width: context.width, height }),
      );
    },
  });
  const value = extension(adapter, {});
  const extensions = createExtensions([adapter]);
  const cache = lifetimeLeafCache(lifetime);
  const measure = (width: number, height: number) =>
    extensionProducer(value as never, width, "/source", operation, extensions, lifetime, cache, height);
  const a = measure(20, 30),
    b = measure(20, 30),
    c = measure(20, 40),
    d = measure(25, 30);
  assert.equal(calls, 3);
  assert.equal(readVisualReference(a, operation, lifetime), readVisualReference(b, operation, lifetime));
  assert.notDeepEqual(readVisualReference(a, operation, lifetime), readVisualReference(c, operation, lifetime));
  assert.notDeepEqual(readVisualReference(a, operation, lifetime), readVisualReference(d, operation, lifetime));
  assert.throws(() => readVisualReference({ ...a }, operation, lifetime), DocumentError);
  const foreign = createPreparingDrawingOperation({});
  assert.throws(() => readVisualReference(a, foreign.operation, lifetime), DocumentError);
  lifetime.active = false;
  assert.throws(() => readVisualReference(a, operation, lifetime), DocumentError);
  stage.controls.close();
  foreign.controls.close();
});

test("a measured result cannot lend a report to a different source or exact width/height request", () => {
  const stage = createPreparingDrawingOperation({});
  const lifetime = { active: true };
  let saved: MeasuredBlock | undefined;
  const adapter = defineBlockAdapter({
    name: "ForeignReferenceTest",
    validate: () => ({}),
    measure(_props, context) {
      if (saved) return saved;
      saved = publishVisualReference(
        context,
        {
          fragmentation: "atomic" as const,
          extent: 1,
          naturalSize: { width: context.width, height: 20 },
          next: () => assert.fail("No selection expected"),
        },
        Object.freeze({ x: 0, y: 0, width: context.width, height: 20 }),
      );
      return saved;
    },
  });
  const extensions = createExtensions([adapter]);
  const a = extension(adapter, {}),
    b = extension(adapter, {});
  const measure = (value: typeof a, width = 30, height = 20) =>
    extensionProducer(value as never, width, "/source", stage.operation, extensions, lifetime, undefined, height);
  measure(a);
  assert.throws(() => measure(b), DocumentError);
  assert.throws(() => measure(a, 40), DocumentError);
  assert.throws(() => measure(a, 30, 40), DocumentError);
  stage.controls.close();
});
