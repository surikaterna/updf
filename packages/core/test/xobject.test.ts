import assert from "node:assert/strict";
import { test } from "node:test";
import { DocumentError, renderUnknown, type XObjectNode } from "@updf/core";
import { createLayoutOperation } from "@updf/core/internal";
import { name } from "@updf/core/pdf";
import { commands } from "../dist/cjs/core/content.js";
import { PdfWriter } from "../dist/cjs/core/pdf-writer.js";
import type { MeasuredPage } from "../dist/cjs/core/plan.js";
import type { PageResources } from "@updf/core/resources";
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
function provider(key?: string, claim?: object): ResourceProvider {
  const slot = resourceSlot<null>();
  return {
    slot,
    collectXObject(site, collection) {
      if (claim && site.resource !== claim) return;
      const resource = collection.intern(slot, site.resource, () => ({
        category: "XObject",
        ...(key === undefined ? {} : { key }),
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
test("generic normalized Form XObjects use the same core name in dictionaries and Do operands", () => {
  const pdf = Buffer.from(renderUnknown(input(), { resources: { shape: owned }, providers: [provider()] })).toString(
    "latin1",
  );
  assert.ok(pdf.includes("/X1 Do"));
  assert.match(pdf, /\/X1 \d+ 0 R/);
  assert.ok(pdf.includes("30 0 0 40 10 40 cm"));
});
test("independent XObject providers need no prefix coordination across aliases, pages and documents", () => {
  const other = createOwnedResource({});
  const children = [node, { ...node, resource: "other", x: 50 }, { ...node, resource: "alias" }];
  const document = {
    version: 1,
    pages: [
      { width: 100, height: 100, children },
      { width: 100, height: 100, children },
    ],
  };
  const options = {
    resources: { shape: owned, alias: owned, other },
    providers: [provider(undefined, owned), provider(undefined, other)],
  };
  const bytes = renderUnknown(document, options);
  const pdf = Buffer.from(bytes).toString("latin1");
  assert.equal((pdf.match(/\/X1 Do/g) ?? []).length, 4);
  assert.equal((pdf.match(/\/X2 Do/g) ?? []).length, 2);
  assert.equal((pdf.match(/\/Subtype \/Form/g) ?? []).length, 2);
  assert.match(pdf, /\/XObject << \/X1 \d+ 0 R \/X2 \d+ 0 R >>/);
  assert.deepEqual(renderUnknown(document, options), bytes);
});
test("trusted lower-level painting and writer boundaries still escape PDF names", () => {
  for (const key of ["__proto__", "constructor", "name /Q\n%#()"]) {
    const page: MeasuredPage = { width: 100, height: 100, children: [{ ...node, owned, path: "" }] };
    const resources: PageResources = {
      resolve() {
        throw new Error("unused");
      },
      painting<T>() {
        return { key, payload: null as T };
      },
    };
    const content = commands(page, { length: 0, maximum: 10000 }, resources).join("");
    const writer = new PdfWriter();
    const root = writer.reserve();
    writer.setRoot(root);
    writer.define(root, { XObject: { [key]: root } });
    const pdf = Buffer.from(writer.seal()).toString("latin1");
    const encoded = key === "name /Q\n%#()" ? "/name#20#2FQ#0A#25#23#28#29" : `/${key}`;
    assert.ok(content.includes(`${encoded} Do`));
    assert.ok(pdf.includes(`${encoded} 1 0 R`));
    assert.ok(content.includes("30 0 0 40 10 40 cm"));
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
test("provider-assigned XObject keys reject before reservations", () => {
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
      error.diagnostics[0]?.path === "/resources",
  );
  assert.throws(
    () => renderUnknown(input(), { resources: { shape: owned }, providers: [provider("\u0100")] }),
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === "RESOURCE" &&
      error.diagnostics[0]?.path === "/resources",
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
