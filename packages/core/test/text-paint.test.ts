import assert from "node:assert/strict";
import test from "node:test";
import { commands } from "../dist/cjs/core/content.js";
import { documentResources } from "../dist/cjs/core/document-resources.js";
import { hex, literal, name } from "../dist/cjs/core/pdf-values.js";
import type { MeasuredPage } from "../dist/cjs/core/plan.js";
import { paintingSlot, type ResourceCollection, resourceSlot } from "../dist/cjs/core/resource-types.js";
import { serialize } from "../dist/cjs/core/serialize.js";
import { textSlot } from "../dist/cjs/core/text-paint.js";

const first = { text: "ignored", x: 10, y: 20 };
const second = { text: "also ignored", x: 30, y: 40 };
const page: MeasuredPage = {
  width: 100,
  height: 100,
  children: [
    {
      type: "text",
      text: "ignored",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      align: "left",
      lineHeight: 12,
      fontSize: 12,
      lines: [first, second],
    },
  ],
};
const slot = resourceSlot<undefined>();
function resource(category = "Font") {
  return {
    category,
    key: "Synthetic",
    phase: "bootstrap" as const,
    payload: undefined,
    reserve(writer: import("../dist/cjs/core/pdf-writer.js").PdfWriter) {
      const ref = writer.reserve();
      return { ref, define: () => writer.define(ref, { Type: name("Font") }) };
    },
  };
}

test("non-font provider supplies literal and hex to real content, lazily once across pages and serializations", () => {
  const shared = { ...page };
  let count = 0;
  let visits = 0;
  const owned = resource();
  const bindings = [literal("(\\)"), hex("0041")].map((payload) => ({
    resource: owned,
    finish() {
      assert.equal(visits, 2);
      count++;
      return payload;
    },
  }));
  const resources = documentResources(
    [page, shared],
    [
      {
        slot,
        collect(_node, collection) {
          visits++;
          collection.intern(slot, "synthetic", () => owned);
          [first, second].forEach((site, i) => {
            const binding = bindings[i];
            assert.ok(binding);
            collection.bindPainting(site, textSlot, binding);
            collection.bindPainting(site, textSlot, binding);
          });
        },
      },
    ],
  );
  assert.equal(count, 0);
  assert.throws(() => commands(page, { length: 0, maximum: 6 }, resources.page(page)));
  assert.equal(count, 1);
  const bytes = serialize([page, shared], resources);
  const raw = Buffer.from(bytes).toString("latin1");
  assert.ok(raw.includes("BT /Synthetic 12 Tf 1 0 0 1 10 80 Tm (\\(\\\\\\)) Tj ET"));
  assert.match(raw, /30 60 Tm <0041> Tj/);
  assert.doesNotMatch(raw, /ignored| W n/);
  assert.equal(count, 2);
  assert.deepEqual(serialize([page, shared], resources), bytes);
  assert.equal(count, 2);
  const result = resources.page(page).painting(first, textSlot);
  assert.equal(result, resources.page(shared).painting(first, textSlot));
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.payload));
  assert.throws(() => resources.page(page).painting({}, textSlot), /Missing/);
  assert.throws(() => resources.page(page).painting(first, paintingSlot("Font")), /Missing/);
  assert.throws(() => resources.page({ ...page }), /Foreign/);
});

test("painting ownership/category/conflicts and every closed mutation path including completion", () => {
  let captured: ResourceCollection | undefined;
  const resources = documentResources(
    [page],
    [
      {
        slot,
        collect(_node, collection) {
          captured = collection;
          const owned = collection.intern(slot, "ok", resource);
          const binding = {
            resource: owned,
            finish: () => {
              assert.throws(() => collection.intern(slot, "late", resource), /closed/);
              assert.throws(() => collection.bind(first, slot, owned), /closed/);
              assert.throws(() => collection.bindPainting(first, textSlot, binding), /closed/);
              return literal("ok");
            },
          };
          assert.throws(
            () => collection.bindPainting(first, textSlot, { ...binding, resource: resource() }),
            /Foreign/,
          );
          const wrong = collection.intern(slot, "wrong", () => resource("Example"));
          assert.throws(() => collection.bindPainting(first, textSlot, { ...binding, resource: wrong }), /category/);
          collection.bindPainting(first, textSlot, binding);
          assert.throws(() => collection.bindPainting(first, textSlot, { ...binding }), /Conflicting/);
        },
      },
    ],
  );
  assert.ok(captured);
  resources.page(page).painting(first, textSlot);
});

test("completion failure aborts serialization without returning a partial document", () => {
  let returned = false;
  const resources = documentResources(
    [page],
    [
      {
        slot,
        collect(_node, collection) {
          const owned = collection.intern(slot, "ok", resource);
          collection.bindPainting(first, textSlot, {
            resource: owned,
            finish() {
              throw new Error("paint failure");
            },
          });
        },
      },
    ],
  );
  assert.throws(() => {
    serialize([page], resources);
    returned = true;
  }, /paint failure/);
  assert.equal(returned, false);
});
