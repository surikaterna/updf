import { test } from "node:test";
import { preparePng } from "@updf/png";
import { deflateSync } from "node:zlib";
import { chunk, container, rejection as failure, fixture, header } from "./helpers.js";

const idat = () => chunk("IDAT", deflateSync(Buffer.from([0, 1, 2, 0, 3, 4])));
test("signature, CRC, truncation, chunk framing/order and IEND are strict", async () => {
  const bytes = fixture();
  for (let end = 0; end < bytes.length; end++) await failure(() => preparePng(bytes.subarray(0, end)), "PNG_DATA");
  for (const index of [0, 12, 20, bytes.length - 1]) {
    const corrupt = Buffer.from(bytes);
    corrupt[index] = corrupt[index]! ^ 1;
    await failure(() => preparePng(corrupt), "PNG_DATA");
  }
  const invalid = [
    container(chunk("IDAT")),
    container(header(0), header(0), idat(), chunk("IEND")),
    container(header(0), chunk("IEND")),
    Buffer.concat([bytes, Buffer.from([0])]),
    container(header(0), idat(), chunk("tEXt"), idat(), chunk("IEND")),
    container(header(0), idat(), chunk("IEND", Buffer.from([0]))),
    container(header(3), idat(), chunk("IEND")),
    container(header(0), chunk("PLTE", Buffer.from([1, 2, 3])), idat(), chunk("IEND")),
    container(header(2), chunk("PLTE", Buffer.from([1, 2])), idat(), chunk("IEND")),
    container(header(0), chunk("tRNS", Buffer.from([1, 0])), idat(), chunk("IEND")),
    container(header(6), chunk("tRNS", Buffer.from([0, 0])), idat(), chunk("IEND")),
    container(header(0), idat(), chunk("tRNS", Buffer.from([0, 0])), chunk("IEND")),
    container(header(0), chunk("sRGB", Buffer.from([4])), idat(), chunk("IEND")),
  ];
  for (const source of invalid) await failure(() => preparePng(source), "PNG_DATA");
});

test("unsupported profiles fail explicitly before decompression", async () => {
  for (const depth of [1, 2, 4, 16]) await failure(() => preparePng(container(header(0, 2, 2, depth))), "PNG_PROFILE");
  await failure(() => preparePng(container(header(6, 2, 2, 8, 1))), "PNG_PROFILE");
  for (const type of ["iCCP", "gAMA", "cHRM", "eXIf", "acTL", "ABCD", "vpAg"]) {
    await failure(() => preparePng(container(header(0), chunk(type), idat(), chunk("IEND"))), "PNG_PROFILE");
  }
});

test("dimension, source, decoded scanline and chunk-count limits precede work", async () => {
  await failure(() => preparePng(container(header(0, 0, 1))), "PNG_DATA");
  await failure(() => preparePng(container(header(0, 0x80000000, 1))), "PNG_DATA");
  await failure(() => preparePng(container(header(0, 16_000_001, 1))), "LIMIT");
  await failure(() => preparePng(container(header(6, 1, 16_000_000))), "LIMIT");
  await failure(() => preparePng(new Uint8Array(8 * 1024 * 1024 + 1)), "LIMIT");
  await failure(
    () => preparePng(container(header(0), ...Array.from({ length: 4096 }, () => chunk("tEXt")), idat(), chunk("IEND"))),
    "LIMIT",
  );
});
