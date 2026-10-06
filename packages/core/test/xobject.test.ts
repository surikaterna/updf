import assert from "node:assert/strict";
import { test } from "node:test";
import { DocumentError, renderUnknown, type XObjectNode } from "@updf/core";
import { createLayoutOperation } from "@updf/core/internal";
import { name } from "@updf/core/pdf";
import {
  createOwnedResource,
  type ResourceCollection,
  type ResourceProvider,
  resourceSlot,
  xObjectSlot,
  type XObjectSite,
} from "@updf/core/resources";

const owned = createOwnedResource({ kind: "test-form" });
const node: XObjectNode = { type: "xObject", resource: "shape", x: 10, y: 20, width: 30, height: 40 };
function input(value: unknown = node): unknown {
  return { version: 1, pages: [{ width: 100, height: 100, children: [value] }] };
}
function rejects(value: unknown, code: string, suffix = ""): void {
  assert.throws(
    () => renderUnknown(input(value), { resources: { shape: owned }, providers: [provider()] }),
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === code &&
      error.diagnostics[0]?.path === `/pages/0/children/0${suffix}`,
  );
}
function provider(key = "__proto__"): ResourceProvider {
  const slot = resourceSlot<null>();
  return {
    slot,
    collectXObject(site, collection) {
      const resource = collection.intern(slot, site.resource, () => ({
        category: "XObject",
        key,
        payload: null,
        phase: "content",
        reserve(writer) {
          const ref = writer.reserve();
          return {
            ref,
            define: () =>
              writer.defineStream(ref, ["0 0 1 1 re f\n"], {
                Type: name("XObject"),
                Subtype: name("Form"),
                BBox: [0, 0, 1, 1],
              }),
          };
        },
      }));
      collection.bindPainting(site.identity, xObjectSlot, { resource, finish: () => null });
    },
  };
}
test("generic normalized Form XObject names are escaped in dictionaries and Do operands", () => {
  for (const key of ["__proto__", "constructor", "name /Q\n%#()"]) {
    const bytes = renderUnknown(input(), { resources: { shape: owned }, providers: [provider(key)] });
    const pdf = Buffer.from(bytes).toString("latin1");
    const encoded = key === "name /Q\n%#()" ? "/name#20#2FQ#0A#25#23#28#29" : `/${key}`;
    assert.ok(pdf.includes(`${encoded} Do`));
    assert.ok(pdf.includes(`${encoded} 4 0 R`) || pdf.includes(`${encoded} 5 0 R`));
    assert.ok(pdf.includes("30 0 0 40 10 40 cm"));
  }
});
test("exact own-data schema, resource grammar, positive dimensions and finite derived geometry", () => {
  for (const key of ["paint", "transform", "clip", "unknown"]) rejects({ ...node, [key]: null }, "KEY", `/${key}`);
  for (const resource of ["", "1name", "name/path", 1]) rejects({ ...node, resource }, "RESOURCE", "/resource");
  for (const key of ["width", "height"]) {
    rejects({ ...node, [key]: 0 }, "GEOMETRY", `/${key}`);
    rejects({ ...node, [key]: Infinity }, "GEOMETRY", `/${key}`);
  }
  rejects({ ...node, x: 90 }, "BOUNDS");
  rejects({ ...node, x: Number.MAX_VALUE, width: Number.MAX_VALUE }, "GEOMETRY", "/width");
  let reads = 0;
  const getter = Object.defineProperty({ ...node }, "resource", {
    enumerable: true,
    get() {
      reads++;
      return "shape";
    },
  });
  rejects(getter, "TYPE", "/resource");
  rejects({ ...node, [Symbol("extra")]: 1 }, "TYPE", "/Symbol(extra)");
  assert.equal(reads, 0);
});
test("one generic leaf charges a node but zero path commands and produces conservative transformed clipped ink", () => {
  renderUnknown(input(), {
    resources: { shape: owned },
    providers: [provider()],
    limits: { nodes: 1, pathCommands: 0 },
  });
  const operation = createLayoutOperation({ resources: { shape: owned }, limits: { pathCommands: 0 } });
  const group = {
    type: "paintGroup" as const,
    transform: [-1, 0, 0, 1, 60, 0] as const,
    clip: { x: 15, y: 25, width: 10, height: 20 },
    children: [node],
  };
  assert.deepEqual(operation.nativeInk([group]), { empty: false, left: 35, top: 25, right: 45, bottom: 45 });
  operation.close();
});
test("conflicting generic XObject keys and invalid PDF name bytes reject before reservations", () => {
  const options = { resources: { shape: owned, other: createOwnedResource({}) }, providers: [provider("same")] };
  const document = {
    version: 1,
    pages: [{ width: 100, height: 100, children: [node, { ...node, resource: "other" }] }],
  };
  assert.throws(
    () => renderUnknown(document, options),
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === "RESOURCE" &&
      error.diagnostics[0]?.path === "/pages/0/children/1/resource",
  );
  assert.throws(
    () => renderUnknown(input(), { resources: { shape: owned }, providers: [provider("\u0100")] }),
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === "RESOURCE" &&
      error.diagnostics[0]?.path === "/pages/0/children/0/resource",
  );
});
test("collectXObject captures validated own callback with original this before initialize mutates it", () => {
  const base = provider();
  let calls = 0;
  const original = base.collectXObject;
  const mutable = {
    ...base,
    marker: 42,
    initialize() {
      mutable.collectXObject = () => {
        throw new Error("new callback");
      };
    },
    collectXObject(site: XObjectSite, collection: ResourceCollection) {
      assert.equal(this, mutable);
      assert.equal(this.marker, 42);
      assert.notEqual(site.identity, node);
      assert.equal((site.identity as XObjectNode).type, "xObject");
      assert.equal(site.resource, owned);
      assert.equal(site.path, "/pages/0/children/0/resource");
      calls++;
      original?.(site, collection);
    },
  };
  renderUnknown(input(), { resources: { shape: owned }, providers: [mutable] });
  assert.equal(calls, 1);
  const accessor = Object.defineProperty({ slot: {} }, "collectXObject", {
    enumerable: true,
    get() {
      calls++;
      throw new Error("getter");
    },
  });
  assert.throws(
    () => renderUnknown(input(), { providers: [accessor] }),
    (error: unknown) =>
      error instanceof DocumentError && error.diagnostics[0]?.path === "/options/providers/0/collectXObject",
  );
  assert.equal(calls, 1);
});
