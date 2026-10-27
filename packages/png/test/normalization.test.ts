import assert from "node:assert/strict";
import { test } from "node:test";
import { deflateSync } from "node:zlib";
import { isOwnedResource } from "@updf/core/resources";
import { preparePng } from "@updf/png";
import { preparePngNormalization } from "@updf/png/normalization";
import { chunk, container, fixture, header, rejection } from "./helpers.js";
import { png16, rows16, withCodec } from "./normalization-fixture.js";

test("16-bit grayscale, RGB, GA and RGBA validate all filters without creating resources or encoding", async () => {
  await withCodec(
    "CompressionStream",
    class {
      constructor() {
        throw new Error("must not encode");
      }
    },
    async () => {
      for (const color of [0, 2, 4, 6]) {
        const source = png16(color);
        const result = await preparePngNormalization(source);
        assert.deepEqual(result.metadata, {
          kind: "png",
          width: 2,
          height: 5,
          bitDepth: 16,
          colorType: color,
          alpha: color >= 4,
        });
        assert.deepEqual(result.bytes, new Uint8Array(source));
        assert.notEqual(result.bytes.buffer, source.buffer);
        assert.ok(Object.isFrozen(result) && Object.isFrozen(result.metadata));
        assert.equal(isOwnedResource(result), false);
        assert.equal(isOwnedResource(result.metadata), false);
      }
    },
  );
});

test("16-bit tRNS accepts full exact sample domain; truecolor PLTE remains optional and legal", async () => {
  for (const color of [0, 2]) {
    for (const sample of [0, 255, 256, 65535]) {
      const transparent = Buffer.alloc(color === 0 ? 2 : 6);
      for (let i = 0; i < transparent.length; i += 2) transparent.writeUInt16BE(sample, i);
      const result = await preparePngNormalization(png16(color, [chunk("tRNS", transparent)]));
      assert.equal(result.metadata.alpha, true);
    }
  }
  for (const color of [2, 6]) {
    const result = await preparePngNormalization(png16(color, [chunk("PLTE", Buffer.from([1, 2, 3]))]));
    assert.equal(result.metadata.colorType, color);
  }
  await rejection(() => preparePng(fixture(0, [1, 2, 3, 4], [chunk("tRNS", Buffer.from([1, 0]))])), "PNG_DATA");
});

test("consecutive IDAT and the existing sRGB/ignored metadata profile validate", async () => {
  const compressed = deflateSync(rows16(2));
  const source = container(
    header(2, 2, 5, 16),
    chunk("sRGB", Buffer.from([3])),
    ...["tEXt", "zTXt", "iTXt", "pHYs", "tIME"].map((type) => chunk(type)),
    chunk("IDAT", compressed.subarray(0, 2)),
    chunk("IDAT"),
    chunk("IDAT", compressed.subarray(2)),
    chunk("IEND"),
  );
  assert.equal((await preparePngNormalization(source)).metadata.colorType, 2);
});

test("eligibility is 16-bit only and native preparation continues rejecting it at IHDR", async () => {
  for (const color of [0, 2, 4, 6]) {
    await rejection(() => preparePng(png16(color)), "PNG_PROFILE");
    await rejection(() => preparePng(container(header(color, 2, 5, 16))), "PNG_PROFILE");
  }
  for (const depth of [1, 2, 4, 8, 32]) {
    await rejection(() => preparePngNormalization(container(header(0, 2, 5, depth))), "PNG_PROFILE");
  }
  for (const color of [1, 3, 5, 7, 255]) {
    await rejection(() => preparePngNormalization(container(header(color, 2, 5, 16))), "PNG_PROFILE");
  }
  assert.equal((await preparePng(fixture())).metadata.kind, "png");
});
