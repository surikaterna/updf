import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { DocumentError } from "@updf/core";
import { ownedResourceBytes } from "@updf/core/resources";
import { prepareJpeg } from "@updf/jpeg";
import { change, failure, fixture, insert, markerOffset, synthetic } from "./helpers.js";

test("original fixtures cover baseline gray, JFIF 444/422/420 with frozen pixel metadata", () => {
  const provenance = JSON.parse(
    readFileSync(new URL("../../../tests/fixtures/jpeg/hashes.json", import.meta.url), "utf8"),
  ) as { hashes: Record<string, string> };
  for (const name of ["gray", "color-1x1", "color-2x1", "color-2x2"]) {
    const bytes = fixture(name);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), provenance.hashes[`${name}.jpg`]);
    const handle = prepareJpeg(bytes);
    assert.deepEqual(handle.metadata, { kind: "jpeg", width: 32, height: 24, components: name === "gray" ? 1 : 3 });
    assert.ok(Object.isFrozen(handle) && Object.isFrozen(handle.metadata));
    assert.equal(ownedResourceBytes(handle), bytes.length);
  }
});
test("all fixture prefixes fail with bounded structured diagnostics, never RangeError", () => {
  for (const name of ["gray", "color-1x1", "color-2x1", "color-2x2"]) {
    const bytes = fixture(name);
    for (let length = 0; length < bytes.length; length++)
      assert.throws(() => prepareJpeg(bytes.subarray(0, length)), DocumentError);
  }
});
test("type/source/pixel limits precede allocation and dimensions must be positive", () => {
  failure(() => prepareJpeg("not bytes" as unknown as Uint8Array), "TYPE");
  failure(() => prepareJpeg(new Uint8Array(new SharedArrayBuffer(20))), "TYPE");
  failure(() => prepareJpeg(new Uint8Array(8 * 1024 * 1024 + 1)), "LIMIT");
  const source = synthetic();
  failure(() => prepareJpeg(change(source, 0xc0, 2, 0)), "JPEG_DATA");
  let large = change(source, 0xc0, 1, 0xff);
  large = change(large, 0xc0, 2, 0xff);
  large = change(large, 0xc0, 3, 0xff);
  failure(() => prepareJpeg(large), "LIMIT");
});
test("unsupported metadata and coding profiles are rejected, without broadening v1", () => {
  const source = fixture();
  for (const marker of [0xe1, 0xe2, 0xee, 0xef, 0xc2, 0xc1, 0xc3, 0xc9, 0xcc])
    failure(() => prepareJpeg(insert(source, marker, [0])), "JPEG_PROFILE");
  failure(() => prepareJpeg(change(source, 0xc0, 0, 12)), "JPEG_PROFILE");
  failure(() => prepareJpeg(change(source, 0xc0, 5, 4)), "JPEG_PROFILE");
  failure(() => prepareJpeg(change(source, 0xc0, 7, 0x31)), "JPEG_PROFILE");
  failure(() => prepareJpeg(change(source, 0xc0, 6, 2)), "JPEG_PROFILE");
  failure(() => prepareJpeg(change(source, 0xda, 0, 1)), "JPEG_PROFILE");
  failure(() => prepareJpeg(change(source, 0xda, 7, 1)), "JPEG_PROFILE");
  const withoutJfif = Uint8Array.from([0xff, 0xd8, ...source.subarray(markerOffset(source, 0xdb))]);
  failure(() => prepareJpeg(withoutJfif), "JPEG_PROFILE");
  failure(() => prepareJpeg(Uint8Array.of(137, 80, 78, 71)), "JPEG_DATA");
});
test("JFIF exact version/density/thumbnail and single immediate APP0 contract", () => {
  const source = synthetic({ jfif: true });
  prepareJpeg(source);
  for (const [offset, value] of [
    [5, 2],
    [6, 3],
    [7, 3],
  ])
    failure(() => prepareJpeg(change(source, 0xe0, offset ?? 0, value ?? 0)), "JPEG_PROFILE");
  for (const offset of [9, 11]) failure(() => prepareJpeg(change(source, 0xe0, offset, 0)), "JPEG_DATA");
  failure(() => prepareJpeg(change(change(source, 0xe0, 12, 1), 0xe0, 13, 1)), "JPEG_DATA");
  failure(() => prepareJpeg(insert(source, 0xe0, Array<number>(14).fill(0))), "JPEG_PROFILE");
  failure(() => prepareJpeg(insert(source, 0xe0, [74, 70, 73, 70, 0, 1, 2, 0, 0, 1, 0, 1, 0, 0], 20)), "JPEG_DATA");
});
test("DQT/DHT lengths, duplicates, trees, symbols and references", () => {
  const source = synthetic();
  failure(() => prepareJpeg(change(source, 0xdb, 1, 0)), "JPEG_DATA");
  failure(() => prepareJpeg(change(source, 0xdb, 0, 0x10)), "JPEG_PROFILE");
  failure(() => prepareJpeg(change(source, 0xdb, 0, 4)), "JPEG_DATA");
  failure(() => prepareJpeg(insert(source, 0xdb, [0, ...Array<number>(64).fill(1)])), "JPEG_DATA");
  for (const count of [2, 3, 255]) failure(() => prepareJpeg(change(source, 0xc4, 1, count)), "JPEG_DATA");
  failure(() => prepareJpeg(change(source, 0xc4, 17, 12)), "JPEG_DATA");
  failure(() => prepareJpeg(change(source, 0xc4, 35, 0x0b)), "JPEG_DATA");
  failure(() => prepareJpeg(change(source, 0xc0, 8, 1)), "JPEG_DATA");
  failure(() => prepareJpeg(change(source, 0xda, 2, 0x11)), "JPEG_DATA");
  failure(() => prepareJpeg(insert(source, 0xc4, [0, 1, ...Array<number>(15).fill(0), 0])), "JPEG_DATA");
  const duplicate = [0, 2, ...Array<number>(15).fill(0), 0, 0];
  failure(() => prepareJpeg(insert(source, 0xc4, duplicate)), "JPEG_DATA");
});
test("Huffman duplicate symbols, empty/framed definitions, baseline AC categories and exact pixel cap", () => {
  const source = synthetic();
  const counts = [0, 2, ...Array<number>(14).fill(0)];
  failure(() => prepareJpeg(insert(source, 0xc4, [1, ...counts, 0, 0])), "JPEG_DATA");
  failure(() => prepareJpeg(insert(source, 0xc4, [1, ...Array<number>(16).fill(0)])), "JPEG_DATA");
  failure(() => prepareJpeg(insert(source, 0xc4, [1, 1, ...Array<number>(15).fill(0)])), "JPEG_DATA");
  failure(() => prepareJpeg(insert(source, 0xdb, [1, 1])), "JPEG_DATA");
  for (const symbol of [0, 0xf0, 1, 0xfa]) prepareJpeg(change(source, 0xc4, 35, symbol));
  for (const symbol of [0x10, 0x0b, 0xff]) failure(() => prepareJpeg(change(source, 0xc4, 35, symbol)), "JPEG_DATA");
  let exact = change(change(source, 0xc0, 1, 31), 0xc0, 2, 64);
  exact = change(change(exact, 0xc0, 3, 31), 0xc0, 4, 64);
  assert.equal(prepareJpeg(exact).metadata.width, 8000);
  failure(() => prepareJpeg(change(exact, 0xc0, 4, 65)), "LIMIT");
});
test("entropy structural checks cover stuffing/fills and cyclic enabled restart sequences", () => {
  prepareJpeg(synthetic({ entropy: [0xff, 0, 1] }));
  prepareJpeg(synthetic({ entropy: [1, 0xff, 0xff] }));
  prepareJpeg(synthetic({ interval: 1, entropy: [1, 0xff, 0xd0, 2, 0xff, 0xd1, 3] }));
  for (const entropy of [[], [1, 0xff, 0xff, 0], [1, 0xff, 0xd0], [1, 0xff, 0xd8]])
    failure(() => prepareJpeg(synthetic({ entropy })), "JPEG_DATA");
  failure(() => prepareJpeg(synthetic({ entropy: [1, 0xff, 0xda] })), "JPEG_PROFILE");
  for (const entropy of [
    [1, 0xff, 0xd1, 2],
    [1, 0xff, 0xd0],
    [1, 0xff, 0xd0, 0xff, 0xd1, 2],
  ])
    failure(() => prepareJpeg(synthetic({ interval: 1, entropy })), "JPEG_DATA");
  failure(() => prepareJpeg(synthetic({ interval: 0, entropy: [1, 0xff, 0xd0, 2] })), "JPEG_DATA");
  failure(() => prepareJpeg(insert(synthetic({ interval: 1 }), 0xdd, [0, 1])), "JPEG_DATA");
  failure(() => prepareJpeg(Uint8Array.from([...synthetic(), 0])), "JPEG_DATA");
});
test("structural validation deliberately accepts invalid entropy; bounded deterministic mutations stay structured", () => {
  assert.equal(prepareJpeg(synthetic({ entropy: [0x42] })).metadata.width, 1);
  const source = fixture();
  for (let i = 0; i < source.length; i += 3) {
    const mutated = new Uint8Array(source);
    mutated[i] = (mutated[i] ?? 0) ^ 0xa5;
    try {
      prepareJpeg(mutated);
    } catch (error) {
      assert.ok(error instanceof DocumentError);
    }
  }
});
