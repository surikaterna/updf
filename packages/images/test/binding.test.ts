import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { useOperationExtension } from "@updf/core/internal";
import { createOwnedResource } from "@updf/core/resources";
import { images } from "@updf/images";
import { createExtensions, defineBlockAdapter, extension, measure } from "@updf/layout";
import { imagesFeature, type ImageBinding } from "../dist/cjs/binding.js";

test("one charged reverse scan per operation; aliases are first-name stable and lookups close", () => {
  const src = createOwnedResource({ kind: "png", width: 2, height: 2 });
  const resources = { first: src, alias: src, unused: createOwnedResource(null) };
  let retained: (() => string) | undefined;
  const work: number[] = [];
  const adapter = defineBlockAdapter({
    name: "test.image-binding",
    validate: (p) => p,
    measure(_props, context) {
      const binding = useOperationExtension<ImageBinding>(context, imagesFeature);
      let count = 0;
      const charge = (n: number, path: string) => {
        count += n;
        context.chargeSourceWork(n, path);
      };
      retained = () => binding.resolve(src, charge);
      assert.equal(retained(), "first");
      assert.equal(count, 4);
      assert.equal(retained(), "first");
      assert.equal(count, 5);
      work.push(count);
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: 100, height: 0 },
        next: () => ({ end: 1, height: 0, nodes: [] }),
      };
    },
  });
  const run = () =>
    measure(
      extension(adapter, {}),
      { width: 100 },
      { resources, extensions: [images()], adapters: createExtensions([adapter]) },
    );
  run();
  assert.throws(() => retained!(), /closed/u);
  run();
  assert.deepEqual(work, [5, 5]);
});

test("exhausted source-node budget never publishes a partial reverse map or resets retry charges", () => {
  const src = createOwnedResource({ kind: "png", width: 2, height: 2 });
  const resources = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`image${i}`, src]));
  let visits = 0;
  const adapter = defineBlockAdapter({
    name: "test.image-binding-limit",
    validate: (p) => p,
    measure(_props, context) {
      const binding = useOperationExtension<ImageBinding>(context, imagesFeature);
      const charge = (n: number, path: string) => {
        visits++;
        context.chargeSourceWork(n, path);
      };
      const limit = (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "LIMIT";
      assert.throws(() => binding.resolve(src, charge), limit);
      const failedAt = visits;
      assert.ok(failedAt < 101);
      assert.throws(() => binding.resolve(src, charge), limit);
      assert.equal(visits, failedAt + 1);
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: 100, height: 0 },
        next: () => ({ end: 1, height: 0, nodes: [] }),
      };
    },
  });
  assert.throws(
    () =>
      measure(
        extension(adapter, {}),
        { width: 100 },
        { resources, extensions: [images()], adapters: createExtensions([adapter]), limits: { nodes: 30 } },
      ),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "LIMIT",
  );
});
