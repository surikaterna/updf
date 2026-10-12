import assert from "node:assert/strict";
import { test } from "node:test";
import { deflateSync, inflateSync } from "node:zlib";
import { preparePng } from "@updf/png";
import { decode } from "../src/decode.js";
import { parse } from "../src/parser.js";
import { chunk, container, failure, fixture, header } from "./helpers.js";

test("all supported color types and alpha/tRNS decode losslessly", () => {
  const cases = [
    { source: fixture(), color: [255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 0], alpha: [255, 128, 0, 255] },
    { source: fixture(0, [10, 20, 30, 40]), color: [10, 20, 30, 40] },
    { source: fixture(4, [10, 0, 20, 128, 30, 255, 40, 64]), color: [10, 20, 30, 40], alpha: [0, 128, 255, 64] },
    { source: fixture(2, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), color: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
    {
      source: fixture(0, [10, 20, 10, 40], [chunk("tRNS", Buffer.from([0, 10]))]),
      color: [10, 20, 10, 40],
      alpha: [0, 255, 0, 255],
    },
    {
      source: fixture(2, [1, 2, 3, 4, 5, 6, 1, 2, 3, 1, 2, 4], [chunk("tRNS", Buffer.from([0, 1, 0, 2, 0, 3]))]),
      color: [1, 2, 3, 4, 5, 6, 1, 2, 3, 1, 2, 4],
      alpha: [0, 255, 0, 255],
    },
    {
      source: fixture(
        3,
        [0, 1, 1, 0],
        [chunk("PLTE", Buffer.from([255, 0, 0, 0, 0, 255])), chunk("tRNS", Buffer.from([64]))],
      ),
      color: [255, 0, 0, 0, 0, 255, 0, 0, 255, 255, 0, 0],
      alpha: [64, 255, 255, 64],
    },
  ];
  for (const entry of cases) {
    const image = decode(parse(entry.source));
    assert.deepEqual([...inflateSync(image.pixels)], entry.color);
    assert.deepEqual(image.alpha ? [...inflateSync(image.alpha)] : undefined, entry.alpha);
  }
});

test("all five filters reconstruct rows with left, up and diagonal predictors", () => {
  const rows = [
    [10, 30, 60, 90, 120, 150],
    [20, 40, 50, 100, 140, 200],
    [0, 250, 100, 255, 60, 0],
  ];
  for (let filter = 0; filter <= 4; filter++) {
    const encoded = rows.flatMap((row, y) => [
      filter,
      ...row.map((value, x) => {
        const a = x >= 3 ? row[x - 3]! : 0,
          b = rows[y - 1]?.[x] ?? 0,
          c = x >= 3 ? (rows[y - 1]?.[x - 3] ?? 0) : 0;
        const p = a + b - c;
        const distances = [Math.abs(p - a), Math.abs(p - b), Math.abs(p - c)];
        const paeth = [a, b, c][distances.indexOf(Math.min(...distances))]!;
        const prediction = [0, a, b, Math.floor((a + b) / 2), paeth][filter]!;
        return (value - prediction) & 255;
      }),
    ]);
    const source = container(header(2, 2, 3), chunk("IDAT", deflateSync(Buffer.from(encoded))), chunk("IEND"));
    assert.deepEqual([...inflateSync(decode(parse(source)).pixels)], rows.flat());
  }
});

test("split IDAT and discarded metadata preserve pixels; sRGB declaration is accepted", () => {
  const encoded = deflateSync(Buffer.from([0, 10, 20, 0, 30, 40]));
  const source = container(
    header(0),
    chunk("sRGB", Buffer.from([0])),
    chunk("tEXt", Buffer.from("author\0test")),
    chunk("IDAT", encoded.subarray(0, 3)),
    chunk("IDAT", encoded.subarray(3)),
    chunk("IEND"),
  );
  assert.deepEqual([...inflateSync(decode(parse(source)).pixels)], [10, 20, 30, 40]);
});

test("invalid scanline filters, lengths, palette indices, zlib and Adler-32 reject", () => {
  for (const rows of [[5, 1, 2, 0, 3, 4], [0, 1], [0, 1, 2, 0, 3, 4, 5], new Array(100000).fill(0)]) {
    failure(
      () => preparePng(container(header(0), chunk("IDAT", deflateSync(Buffer.from(rows))), chunk("IEND"))),
      "PNG_DATA",
    );
  }
  for (const compressed of [
    Buffer.from([1, 2, 3, 4, 5, 6]),
    deflateSync(Buffer.from([0, 1, 2, 0, 3, 4])).subarray(0, -1),
  ]) {
    failure(() => preparePng(container(header(0), chunk("IDAT", compressed), chunk("IEND"))), "PNG_DATA");
  }
  const badAdler = deflateSync(Buffer.from([0, 1, 2, 0, 3, 4]));
  badAdler[badAdler.length - 1] = badAdler[badAdler.length - 1]! ^ 1;
  failure(() => preparePng(container(header(0), chunk("IDAT", badAdler), chunk("IEND"))), "PNG_DATA");
  failure(() => preparePng(fixture(3, [0, 1, 2, 0], [chunk("PLTE", Buffer.from([1, 2, 3]))])), "PNG_DATA");
});
