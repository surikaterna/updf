import assert from "node:assert/strict";
import { test } from "node:test";
import { render } from "@updf/core";
import { jpegProvider, prepareJpeg } from "@updf/jpeg";
import { PdfWriter } from "../../core/dist/cjs/core/pdf-writer.js";
import { document, failure, fixture, insert, markerOffset } from "./helpers.js";

test("actual JPEG provider reaches typed stream budget check without an eager binary snapshot", () => {
  const original = fixture();
  const source = insert(original, 0xfe, Array<number>(4000).fill(65), markerOffset(original, 0xdb));
  const photo = prepareJpeg(source);
  const Original = globalThis.Uint8Array;
  const define = PdfWriter.prototype.defineStream;
  let copies = 0,
    images = 0;
  globalThis.Uint8Array = new Proxy(Original, {
    construct(target, args, newTarget) {
      if (args[0] instanceof Original && args[0].length === source.length) copies++;
      return Reflect.construct(target, args, newTarget);
    },
  });
  PdfWriter.prototype.defineStream = function (ref, chunks, dictionary = {}) {
    if (chunks.some((chunk) => chunk instanceof Original && chunk.length === source.length)) images++;
    return define.call(this, ref, chunks, dictionary);
  };
  try {
    failure(
      () => render(document(), { resources: { photo }, providers: [jpegProvider()], limits: { outputBytes: 2000 } }),
      "LIMIT",
      "",
    );
    assert.equal(images, 1);
    assert.equal(copies, 0);
    render(document(), { resources: { photo }, providers: [jpegProvider()] });
    assert.equal(copies, 1);
  } finally {
    globalThis.Uint8Array = Original;
    PdfWriter.prototype.defineStream = define;
  }
});
test("source byte properties cannot bypass pre-copy quota/type checks or invoke caller getters", () => {
  let reads = 0;
  const source = fixture();
  for (const key of ["buffer", "byteLength"])
    Object.defineProperty(source, key, {
      get() {
        reads++;
        throw new Error("getter");
      },
    });
  prepareJpeg(source);
  assert.equal(reads, 0);
  const oversized = new Uint8Array(8 * 1024 * 1024 + 1);
  Object.defineProperty(oversized, "byteLength", { value: 0 });
  failure(() => prepareJpeg(oversized), "LIMIT");
});
test("proxy and prototype-spoofed sources fail with TYPE at /source without caller code", () => {
  let reads = 0;
  const unexpectedRead = () => {
    reads++;
    throw new Error("caller code must not run");
  };
  const spoof = Object.create(Uint8Array.prototype) as Uint8Array;
  for (const key of ["buffer", "byteLength", Symbol.iterator])
    Object.defineProperty(spoof, key, { get: unexpectedRead });
  const sources = [
    new Proxy(new Uint8Array(4), {}),
    new Proxy(new Uint8Array(4), { get: unexpectedRead, getPrototypeOf: unexpectedRead }),
    spoof,
  ];
  for (const source of sources) failure(() => prepareJpeg(source), "TYPE", "/source");
  assert.equal(reads, 0);
});
test("genuine Uint8Array subclasses ignore caller properties and iteration", () => {
  class Bytes extends Uint8Array {}
  const source = new Bytes(fixture());
  let reads = 0;
  for (const key of ["buffer", "byteLength", "byteOffset", "length", Symbol.iterator, Symbol.toStringTag])
    Object.defineProperty(source, key, {
      get() {
        reads++;
        throw new Error("caller code must not run");
      },
    });
  assert.equal(prepareJpeg(source).metadata.width, 32);
  assert.equal(reads, 0);
});
test("Uint16Array containing valid JPEG elements cannot spoof Uint8Array", () => {
  const source = new Uint16Array(fixture());
  Object.setPrototypeOf(source, Uint8Array.prototype);
  failure(() => prepareJpeg(source as unknown as Uint8Array), "TYPE", "/source");
});
test("non-Uint8Array internal kinds cannot spoof source authenticity", () => {
  const bytes = fixture();
  const sources = [
    new DataView(bytes.buffer),
    new Uint16Array(bytes),
    new Uint8ClampedArray(bytes),
    new Int8Array(bytes),
    new Uint32Array(bytes),
    new Int16Array(bytes),
    new Int32Array(bytes),
    new Float32Array(bytes),
    new Float64Array(bytes),
    new BigInt64Array(4),
    new BigUint64Array(4),
  ];
  let reads = 0;
  for (const source of sources) {
    failure(() => prepareJpeg(source as unknown as Uint8Array), "TYPE", "/source");
    Object.setPrototypeOf(source, Uint8Array.prototype);
    Object.defineProperty(source, Symbol.toStringTag, {
      get() {
        reads++;
        throw new Error("caller code must not run");
      },
    });
    failure(() => prepareJpeg(source as unknown as Uint8Array), "TYPE", "/source");
  }
  assert.equal(reads, 0);
});
test("detached source fails with JPEG_DATA at /source before copying", () => {
  const source = fixture();
  structuredClone(source.buffer, { transfer: [source.buffer] });
  failure(() => prepareJpeg(source), "JPEG_DATA", "/source");
});
