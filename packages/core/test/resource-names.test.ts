import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { documentResources } from "../dist/cjs/core/document-resources.js";
import { PdfWriter } from "../dist/cjs/core/pdf-writer.js";
import type { MeasuredPage } from "../dist/cjs/core/plan.js";
import { type Resource, type ResourceDefinition, type ResourceProvider, resourceSlot } from "@updf/core/resources";
import { drawing } from "../dist/cjs/painting/read.js";

function definition(
  category: string,
  phase: "bootstrap" | "content" = "content",
): ResourceDefinition<{ count: number }> {
  return {
    category,
    phase,
    payload: { count: 0 },
    reserve(writer) {
      assert.ok(Object.isFrozen(this));
      const ref = writer.reserve();
      return { ref, define: () => writer.define(ref, { Count: this.payload.count }) };
    },
  };
}

test("two independent providers per category share first-intern naming but retain provider-major reservations", () => {
  const categories = ["XObject", "Font", "ExtGState", "Custom /\xff", "", "__proto__", "constructor"];
  const records: Resource<{ count: number }>[] = [];
  const providers = categories.flatMap((category) =>
    [0, 1].map((i): ResourceProvider => {
      const slot = resourceSlot<{ count: number }>();
      return {
        slot,
        initialize(collection) {
          const input = definition(category, i === 0 ? "content" : "bootstrap");
          const resource = collection.intern(slot, "same identity", () => input);
          records.push(resource);
          assert.notEqual(resource, input);
          assert.equal(Object.isFrozen(input), false);
          assert.equal(resource.payload, input.payload);
          assert.equal(
            collection.intern(slot, "same identity", () => {
              throw new Error("reuse");
            }),
            resource,
          );
          resource.payload.count++;
          assert.throws(() => Object.defineProperty(resource, "key", { value: "Override" }), TypeError);
        },
      };
    }),
  );
  const resources = documentResources([], providers);
  assert.deepEqual(
    records.map((resource) => resource.key),
    ["X1", "X2", "F1", "F2", "GS1", "GS2", "R1", "R2", "R1", "R2", "R1", "R2", "R1", "R2"],
  );
  const writer = new PdfWriter();
  const root = writer.reserve();
  writer.setRoot(root);
  const reserved = resources.open(writer);
  reserved.reserve("bootstrap");
  reserved.reserve("content");
  writer.define(root, { Resources: reserved.dictionary });
  reserved.define("bootstrap");
  reserved.define("content");
  const raw = Buffer.from(writer.seal()).toString("latin1");
  assert.match(raw, /\/XObject << \/X2 2 0 R \/X1 9 0 R >>/);
  assert.equal((raw.match(/\/Count 1/g) ?? []).length, 14);
});

function invalidDefinitions(): unknown[] {
  const valid = definition("Font");
  const inherited = Object.assign(Object.create({ key: "Inherited" }), valid);
  return [
    null,
    1,
    { ...valid, key: "Override" },
    inherited,
    { ...valid, extra: true },
    { ...valid, [Symbol("extra")]: true },
    { ...valid, category: "\u0100" },
    { ...valid, category: 1 },
    { ...valid, phase: "later" },
    { ...valid, reserve: 1 },
    Object.create(valid),
    { category: "Font", phase: "content", reserve: valid.reserve },
    ...["category", "phase", "payload", "reserve", "key"].map((field) =>
      Object.defineProperty({ ...valid }, field, {
        enumerable: true,
        get() {
          throw new Error("getter must not execute");
        },
      }),
    ),
  ];
}

test("own-data definitions accept null prototypes and data constructors; later factory mutation cannot rename records", () => {
  const slot = resourceSlot<{ count: number }>();
  class DataDefinition {
    category = "Font";
    phase = "content" as const;
    payload = { count: 0 };
    reserve = definition("Font").reserve;
  }
  const inputs = [Object.assign(Object.create(null), definition("Font")), new DataDefinition()];
  documentResources(
    [],
    [
      {
        slot,
        initialize(collection) {
          for (const [index, input] of inputs.entries()) {
            const record = collection.intern(slot, index, () => input);
            input.category = "XObject";
            input.reserve = () => {
              throw new Error("replaced factory callback");
            };
            assert.equal(record.category, "Font");
            assert.equal(record.key, `F${index + 1}`);
            assert.notEqual(record.reserve, input.reserve);
          }
        },
      },
    ],
  );
});

test("independent Font and ExtGState providers bind their own returned records across pages", () => {
  const slots = [0, 1, 2, 3].map(() => resourceSlot<{ count: number }>());
  const paint = drawing({ type: "rect", x: 0, y: 0, width: 1, height: 1 }, "");
  const page: MeasuredPage = {
    width: 10,
    height: 10,
    children: [{ type: "rect", x: 0, y: 0, width: 1, height: 1, painting: paint }],
  };
  const shared = { ...page };
  const providers = slots.map(
    (slot, index): ResourceProvider => ({
      slot,
      collectDrawing(site, collection) {
        const record = collection.intern(slot, "same identity", () => definition(index < 2 ? "Font" : "ExtGState"));
        collection.bind(site, slot, record);
      },
    }),
  );
  const resources = documentResources([page, shared], providers);
  assert.deepEqual(
    slots.map((slot) => resources.page(page).resolve(paint, slot).key),
    ["F1", "F2", "GS1", "GS2"],
  );
  for (const slot of slots)
    assert.equal(resources.page(page).resolve(paint, slot), resources.page(shared).resolve(paint, slot));
});

test("failed factories and malformed definitions leave no naming holes in initialization or traversal", () => {
  const slot = resourceSlot<{ count: number }>();
  const collected: string[] = [];
  const attempt = (collection: Parameters<NonNullable<ResourceProvider["initialize"]>>[0]) => {
    for (const invalid of invalidDefinitions()) {
      assert.throws(
        () => collection.intern(slot, {}, () => invalid as ResourceDefinition<{ count: number }>),
        (error: unknown) =>
          error instanceof DocumentError &&
          error.diagnostics[0]?.code === "RESOURCE" &&
          error.diagnostics[0]?.path === "/resources",
      );
    }
    assert.throws(
      () =>
        collection.intern(slot, {}, () => {
          throw new Error("factory");
        }),
      /factory/,
    );
    collected.push(collection.intern(slot, {}, () => definition("Font")).key);
  };
  const paint = drawing({ type: "rect", x: 0, y: 0, width: 1, height: 1 }, "");
  const page: MeasuredPage = {
    width: 10,
    height: 10,
    children: [{ type: "rect", x: 0, y: 0, width: 1, height: 1, painting: paint }],
  };
  let captured: Parameters<typeof attempt>[0] | undefined;
  const provider: ResourceProvider = {
    slot,
    initialize(collection) {
      captured = collection;
      attempt(collection);
    },
    collectDrawing(_drawing, collection) {
      attempt(collection);
    },
  };
  documentResources([page, page], [provider]);
  assert.deepEqual(collected, ["F1", "F2", "F3"]);
  assert.throws(() => captured!.intern(slot, {}, () => definition("Font")), /closed/);
  collected.length = 0;
  documentResources([page], [provider]);
  assert.deepEqual(collected, ["F1", "F2"]);
});
