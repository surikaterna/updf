import assert from "node:assert/strict";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { render } from "@updf/core";
import { jpegProvider, prepareJpeg } from "@updf/jpeg";
import { document, failure, fixture } from "./helpers.js";

test("shared backing cannot spoof ordinary ArrayBuffer by changing its prototype", () => {
  const backing = new SharedArrayBuffer(fixture().length);
  const source = new Uint8Array(backing);
  source.set(fixture());
  Object.setPrototypeOf(backing, ArrayBuffer.prototype);
  failure(() => prepareJpeg(source), "TYPE");
});

test("genuine views and buffers accept null, trapping and revoked proxy prototypes without callbacks", () => {
  let calls = 0;
  const unexpected = () => {
    calls++;
    throw new Error("caller code must not run");
  };
  const revoked = Proxy.revocable({}, {});
  revoked.revoke();
  for (const prototype of [null, new Proxy({}, { get: unexpected, getPrototypeOf: unexpected }), revoked.proxy]) {
    const source = fixture();
    const backing = source.buffer;
    Object.setPrototypeOf(source, prototype);
    Object.setPrototypeOf(backing, prototype);
    assert.equal(prepareJpeg(source).metadata.width, 32);
  }
  assert.equal(calls, 0);
});

test("cross-realm Uint8Array makes an immutable private copy before caller detachment", () => {
  const source = runInNewContext("Uint8Array.from(bytes)", { bytes: Array.from(fixture()) }) as Uint8Array;
  const backing = source.buffer;
  const photo = prepareJpeg(source);
  assert.equal(photo.metadata.width, 32);
  const options = { resources: { photo }, providers: [jpegProvider()] };
  const expected = render(document(), options);
  source.fill(0);
  structuredClone(backing, { transfer: [backing] });
  assert.deepEqual(render(document(), options), expected);
});

test("Buffer and subclass subarrays ignore constructors, species, properties and iterators", () => {
  class Bytes extends Uint8Array {}
  let calls = 0;
  const unexpected = () => {
    calls++;
    throw new Error("caller code must not run");
  };
  for (const allocation of [Buffer.alloc(fixture().length + 8), new Bytes(fixture().length + 8)]) {
    allocation.set(fixture(), 4);
    const source = allocation.subarray(4, allocation.length - 4);
    const backing = source.buffer;
    for (const key of [
      "constructor",
      "buffer",
      "byteLength",
      "byteOffset",
      "length",
      Symbol.iterator,
      Symbol.toStringTag,
    ])
      Object.defineProperty(source, key, { get: unexpected });
    Object.defineProperty(backing, "constructor", { get: unexpected });
    Object.defineProperty(backing, Symbol.species, { get: unexpected });
    assert.equal(prepareJpeg(source).metadata.width, 32);
  }
  assert.equal(calls, 0);
});
