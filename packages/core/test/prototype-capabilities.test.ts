import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

const script = `
import assert from "node:assert/strict";
import { DocumentError } from "@updf/core";
import { createOwnedResource } from "@updf/core/resources";
import { ownedResourceBytes } from "@updf/core/resources";
import { fontRuntime } from "@updf/fonts";
import { createTextService } from "@updf/text";
import { operation } from "./packages/core/dist/core/operation.js";
import { documentResources } from "./packages/core/dist/core/document-resources.js";
let calls = 0;
function contaminated(key, descriptor, run) {
  const previous = Object.getOwnPropertyDescriptor(Object.prototype, key);
  Object.defineProperty(Object.prototype, key, { configurable: true, ...descriptor });
  try { run(); }
  finally {
    if (previous) Object.defineProperty(Object.prototype, key, previous);
    else delete Object.prototype[key];
  }
}
function missing(run, path, code = "FONT_RESOURCE") {
  assert.throws(run, error => error instanceof DocumentError &&
    error.diagnostics[0]?.code === code && error.diagnostics[0]?.path === path);
}
const getter = { get() { calls++; throw new Error("inherited getter invoked"); } };
const inherited = { value() { calls++; throw new Error("inherited function invoked"); } };
for (const descriptor of [getter, inherited]) {
  for (const key of ["resources", "text", "providers"]) {
    contaminated(key, descriptor, () => {
      const owned = operation({});
      assert.equal(owned.fonts.bindings.size, 0);
       assert.equal(owned.fonts.service, undefined);
      assert.equal(owned.providers.length, 0);
    });
  }
  for (const key of Object.keys(fontRuntime())) {
    const runtime = { ...fontRuntime() };
    delete runtime[key];
    contaminated(key, descriptor, () =>
       missing(() => createTextService({ runtime }), "/text/runtime/" + key));
  }
  for (const key of Object.keys(createTextService({ runtime: fontRuntime() }))) {
    const text = { ...createTextService({ runtime: fontRuntime() }) };
    delete text[key];
    contaminated(key, descriptor, () => missing(() => operation({ text }), "/options/text/" + key));
  }
  contaminated("byteLength", descriptor, () => assert.equal(ownedResourceBytes(createOwnedResource({})), 0));
  contaminated("slot", descriptor, () =>
    missing(() => operation({ providers: [{}] }), "/options/providers/0/slot"));
  for (const key of ["initialize", "collectText", "collectDrawing"]) {
    contaminated(key, descriptor, () => {
      const owned = operation({ providers: [{ slot: {} }] });
      assert.equal(owned.providers[0][key], undefined);
      assert.equal(Object.getPrototypeOf(owned.providers[0]), null);
      documentResources([], owned.providers);
    });
  }
  const owned = operation({ providers: [{ slot: {} }] });
  contaminated("initialize", descriptor, () => documentResources([], owned.providers));
   contaminated("service", descriptor, () => {
     assert.equal(operation({}).fonts.service, undefined);
  });
}
for (const key of ["resources", "text", "providers"]) {
  const options = Object.defineProperty({}, key, { enumerable: true, ...getter });
  missing(() => operation(options), "/options/" + key, "TYPE");
}
missing(() => operation({ providers: {} }), "/options/providers", "TYPE");
missing(() => operation({ providers: [null] }), "/options/providers/0", "TYPE");
missing(() => operation({ providers: [{ slot: null }] }), "/options/providers/0/slot");
missing(() => operation({ providers: [{ slot: {}, initialize: undefined }] }), "/options/providers/0/initialize");
assert.equal(calls, 0);
const sentinel = new Error("legitimate capability failure");
const service = createTextService({ runtime: { ...fontRuntime(), validateResource() { throw sentinel; } } });
const context = { bindings: new Map([["A", createOwnedResource({})]]) };
assert.throws(() => service.validateStyle({ font: "A", fontSize: 10, color: [0,0,0] }, context, "/style"), error => error === sentinel);
const owned = operation({ providers: [{ slot: {}, initialize() { throw sentinel; } }] });
assert.throws(() => documentResources([], owned.providers), error => error === sentinel);
`;

test("resource capabilities ignore prototype getters and functions in an isolated process", () => {
  const result = spawnSync(process.execPath, ["--input-type=module", "--eval", script], {
    cwd: new URL("../../../", import.meta.url),
    encoding: "utf8",
    timeout: 30_000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
