import assert from "node:assert/strict";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { render } from "@updf/core";
import { createOwnedResource, ownedResourceBytes } from "@updf/core/resources";
import { h, lower } from "@updf/core/vdom";
import { jpegProvider } from "@updf/jpeg";
import { pngProvider, preparePng } from "@updf/png";
import { document, failure, fixture } from "./helpers.js";

const binary = (bytes: Uint8Array) => Buffer.from(bytes).toString("latin1");
test("private immutable ownership, alias/page reuse, separate identities and operation-local references", () => {
  const source = fixture();
  const image = preparePng(source);
  source.fill(0);
  assert.deepEqual(image.metadata, { kind: "png", width: 2, height: 2, components: 3, alpha: true });
  assert.ok(Object.isFrozen(image.metadata));
  const options = { resources: { image, alias: image }, providers: [pngProvider(), jpegProvider()] };
  const input = { version: 1 as const, pages: [...document().pages, ...document("alias").pages] };
  const output = render(input, options);
  const pdf = binary(output);
  assert.equal((pdf.match(/\/Subtype \/Image/g) ?? []).length, 2);
  assert.equal((pdf.match(/\/SMask /g) ?? []).length, 1);
  assert.equal((pdf.match(/\/X1 Do/g) ?? []).length, 2);
  assert.ok(pdf.includes("60 0 0 40 10 40 cm\n/X1 Do"));
  assert.deepEqual(render(input, options), output);
  const distinct = render(input, { ...options, resources: { image, alias: preparePng(fixture()) } });
  assert.equal((binary(distinct).match(/\/Subtype \/Image/g) ?? []).length, 4);
  failure(() => render(input, { ...options, limits: { outputBytes: 100 } }), "LIMIT");
  assert.deepEqual(render(input, options), output);
});

test("gray without alpha uses one image; unused bindings do not change output", () => {
  const image = preparePng(fixture(0, [1, 2, 3, 4]));
  const options = { resources: { image }, providers: [pngProvider()] };
  const pdf = binary(render(document(), options));
  assert.match(pdf, /\/ColorSpace \/DeviceGray/u);
  assert.ok(!pdf.includes("/SMask"));
  const empty = { version: 1 as const, pages: [{ width: 100, height: 100, children: [] }] };
  assert.deepEqual(render(empty), render(empty, options));
});

test("provider failures and resource budgets include unused unique images", () => {
  const image = preparePng(fixture());
  const options = { resources: { image, alias: image }, providers: [pngProvider()] };
  failure(() => render(document()), "RESOURCE");
  failure(() => render(document(), { resources: { image } }), "RESOURCE");
  failure(() => render(document(), { ...options, providers: [jpegProvider()] }), "RESOURCE");
  failure(() => render(document(), { ...options, providers: [pngProvider(), pngProvider()] }), "RESOURCE");
  failure(
    () => render(document(), { ...options, resources: { image: createOwnedResource(image.metadata) } }),
    "RESOURCE",
  );
  const size = ownedResourceBytes(image);
  assert.ok(size > fixture().length);
  render(document(), { ...options, limits: { resourceBytes: size } });
  failure(() => render(document(), { ...options, limits: { resourceBytes: size - 1 } }), "LIMIT");
  failure(
    () =>
      render(document(), {
        ...options,
        resources: { ...options.resources, unused: preparePng(fixture()) },
        limits: { resourceBytes: size },
      }),
    "LIMIT",
  );
});

test("native VDOM uses the same XObject contract", () => {
  const options = { resources: { image: preparePng(fixture()) }, providers: [pngProvider()] };
  const tree = h("document", {
    version: 1,
    children: h("page", {
      width: 100,
      height: 100,
      children: h("xObject", { resource: "image", x: 10, y: 20, width: 60, height: 40 }),
    }),
  });
  assert.deepEqual(render(lower(tree, options), options), render(document(), options));
});

test("source boundary accepts views and cross-realm bytes without invoking overrides", () => {
  const bytes = fixture();
  const backing = Buffer.concat([Buffer.from([1, 2]), bytes, Buffer.from([3])]);
  assert.deepEqual(preparePng(backing.subarray(2, -1)).metadata, preparePng(bytes).metadata);
  const foreign: Uint8Array = runInNewContext(`new Uint8Array(${JSON.stringify([...bytes])})`);
  assert.deepEqual(preparePng(foreign).metadata, preparePng(bytes).metadata);
  for (const key of ["buffer", "byteLength", "byteOffset", "slice", Symbol.iterator, Symbol.toStringTag]) {
    Object.defineProperty(bytes, key, {
      get() {
        throw new Error("caller override executed");
      },
    });
  }
  preparePng(bytes);
  for (const value of [
    {},
    [],
    new DataView(new ArrayBuffer(10)),
    new Uint8Array(new SharedArrayBuffer(10)),
    new Proxy(fixture(), {}),
  ]) {
    failure(() => preparePng(value as Uint8Array), "TYPE");
  }
});
