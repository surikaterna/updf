import assert from "node:assert/strict";
import { test } from "node:test";
import { deflateSync } from "node:zlib";
import { preparePngNormalization } from "@updf/png/normalization";
import { chunk, container, header, rejection } from "./helpers.js";
import { png16, rows16, withCodec } from "./normalization-fixture.js";

const idat = () => chunk("IDAT", deflateSync(rows16(2)));
const head = () => header(2, 2, 5, 16);

test("every truncation, signature, original CRC, chunk framing and terminal source bytes are checked", async () => {
  const source = png16(2);
  for (let end = 0; end < source.length; end++)
    await rejection(() => preparePngNormalization(source.subarray(0, end)), "PNG_DATA");
  for (const index of [0, 12, 20, 40, source.length - 1]) {
    const corrupt = Buffer.from(source);
    corrupt[index] = corrupt[index]! ^ 1;
    await rejection(() => preparePngNormalization(corrupt), "PNG_DATA");
  }
  await rejection(() => preparePngNormalization(Buffer.concat([source, Buffer.from([0])])), "PNG_DATA");
});

test("shared parser enforces chunk ordering, legal palettes, transparency shape and duplicate declarations", async () => {
  const palette = chunk("PLTE", Buffer.from([1, 2, 3]));
  const trns = chunk("tRNS", Buffer.alloc(6));
  const srgb = chunk("sRGB", Buffer.from([0]));
  const cases = [
    [chunk("IDAT")],
    [head(), head(), idat(), chunk("IEND")],
    [head(), chunk("IEND")],
    [head(), idat()],
    [head(), idat(), chunk("IEND", Buffer.from([0]))],
    [head(), idat(), chunk("tEXt"), idat(), chunk("IEND")],
    [head(), palette, palette, idat(), chunk("IEND")],
    [head(), idat(), palette, chunk("IEND")],
    [head(), trns, palette, idat(), chunk("IEND")],
    [head(), chunk("PLTE"), idat(), chunk("IEND")],
    [head(), chunk("PLTE", Buffer.alloc(769)), idat(), chunk("IEND")],
    [head(), chunk("PLTE", Buffer.alloc(2)), idat(), chunk("IEND")],
    [head(), trns, trns, idat(), chunk("IEND")],
    [head(), idat(), trns, chunk("IEND")],
    [head(), srgb, srgb, idat(), chunk("IEND")],
    [head(), palette, srgb, idat(), chunk("IEND")],
    [head(), idat(), srgb, chunk("IEND")],
    [head(), chunk("sRGB", Buffer.from([4])), idat(), chunk("IEND")],
  ];
  for (const parts of cases) await rejection(() => preparePngNormalization(container(...parts)), "PNG_DATA");
  for (const color of [0, 4]) await rejection(() => preparePngNormalization(png16(color, [palette])), "PNG_DATA");
  for (const color of [0, 2, 4, 6]) {
    for (const length of [0, 1, 2, 4, 6, 8]) {
      if ((color === 0 && length === 2) || (color === 2 && length === 6)) continue;
      await rejection(() => preparePngNormalization(png16(color, [chunk("tRNS", Buffer.alloc(length))])), "PNG_DATA");
    }
  }
});

async function rejectDimensionsAndLimits(): Promise<void> {
  for (const dimensions of [
    [0, 1],
    [0x80000000, 1],
  ]) {
    await rejection(() => preparePngNormalization(container(header(0, dimensions[0], dimensions[1], 16))), "PNG_DATA");
  }
  for (const [color, width, height] of [
    [0, 16_000_001, 1],
    [6, 4096, 2048],
  ]) {
    await rejection(() => preparePngNormalization(container(header(color, width, height, 16))), "LIMIT");
  }
  await rejection(() => preparePngNormalization(new Uint8Array(8 * 1024 * 1024 + 1)), "LIMIT");
  await rejection(
    () =>
      preparePngNormalization(
        container(head(), ...Array.from({ length: 4096 }, () => chunk("tEXt")), idat(), chunk("IEND")),
      ),
    "LIMIT",
  );
}

test("unsupported chunks, methods, interlace and quotas reject before native decompression allocation", async () => {
  let calls = 0;
  const Native = globalThis.DecompressionStream;
  await withCodec(
    "DecompressionStream",
    class extends Native {
      constructor() {
        super("deflate");
        calls++;
      }
    },
    async () => {
      for (const type of ["iCCP", "eXIf", "acTL", "fcTL", "fdAT", "ABCD", "vpAg"]) {
        await rejection(() => preparePngNormalization(png16(2, [chunk(type)])), "PNG_PROFILE");
      }
      for (const field of [10, 11, 12]) {
        const data = head().subarray(8, -4);
        data[field] = 1;
        await rejection(
          () => preparePngNormalization(container(chunk("IHDR", data), idat(), chunk("IEND"))),
          "PNG_PROFILE",
        );
      }
      await rejectDimensionsAndLimits();
      const corrupt = png16();
      corrupt[corrupt.length - 1] = corrupt[corrupt.length - 1]! ^ 1;
      await rejection(() => preparePngNormalization(corrupt), "PNG_DATA");
      assert.equal(calls, 0);
      await preparePngNormalization(png16());
      assert.equal(calls, 1);
    },
  );
});

test("bounded inflate checks all row filters, exact output length, zlib framing, Adler and trailing compressed bytes", async () => {
  const rows = rows16(2);
  const invalidRows = [rows.subarray(0, -1), Buffer.concat([rows, Buffer.from([0])]), Buffer.alloc(100000)];
  for (const start of [0, 13, 52]) {
    const invalid = Buffer.from(rows);
    invalid[start] = 5;
    invalidRows.push(invalid);
  }
  for (const invalid of invalidRows) await rejection(() => preparePngNormalization(png16(2, [], invalid)), "PNG_DATA");
  const compressed = deflateSync(rows, { level: 0 });
  const adler = Buffer.from(compressed);
  adler[adler.length - 1] = adler[adler.length - 1]! ^ 1;
  const block = Buffer.from(compressed);
  block[5] = block[5]! ^ 1;
  const method = Buffer.from(compressed);
  method[0] = 0;
  const invalidStreams = [
    adler,
    block,
    method,
    Buffer.concat([compressed, Buffer.from([0])]),
    Buffer.concat([compressed, compressed]),
  ];
  for (let end = 0; end < compressed.length; end++) invalidStreams.push(compressed.subarray(0, end));
  for (const invalid of invalidStreams) {
    await rejection(
      () => preparePngNormalization(container(head(), chunk("IDAT", invalid), chunk("IEND"))),
      "PNG_DATA",
    );
  }
});

test("exact input/chunk/pixel bounds and the last whole two-byte row below 64 MiB are not tightened", async () => {
  let calls = 0;
  const Native = globalThis.DecompressionStream;
  await withCodec(
    "DecompressionStream",
    class extends Native {
      constructor() {
        super("deflate");
        calls++;
      }
    },
    async () => {
      const empty = chunk("IDAT", deflateSync(Buffer.alloc(0)));
      for (const [color, width, height] of [
        [0, 16_000_000, 1],
        [6, 4095, 2048],
      ]) {
        // Empty decoded data reaches native validation, without allocating a maximum-size fixture.
        await rejection(
          () => preparePngNormalization(container(header(color, width, height, 16), empty, chunk("IEND"))),
          "PNG_DATA",
        );
      }
      assert.equal(calls, 2);
      const source = container(head(), ...Array.from({ length: 4093 }, () => chunk("tEXt")), idat(), chunk("IEND"));
      assert.equal((await preparePngNormalization(source)).metadata.width, 2);
      assert.equal(calls, 3);
      await rejection(() => preparePngNormalization(new Uint8Array(8 * 1024 * 1024)), "PNG_DATA");
      assert.equal(calls, 3);
    },
  );
});
