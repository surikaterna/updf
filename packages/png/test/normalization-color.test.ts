import assert from "node:assert/strict";
import { test } from "node:test";
import { deflateSync } from "node:zlib";
import { preparePng } from "@updf/png";
import { preparePngNormalization } from "@updf/png/normalization";
import { chunk, container, fixture, header, rejection } from "./helpers.js";
import { chrm, declaration, gamma, permutations, srgb, standard } from "./normalization-color-fixture.js";
import { png16, rows16, withCodec } from "./normalization-fixture.js";

test("optional metadata supports independent declarations, all sRGB orders and missing companions", async () => {
  const cases = [[], [gamma()], [chrm()], [gamma(), chrm()], [chrm(), gamma()], [srgb()]];
  cases.push(...permutations([gamma(), srgb()]), ...permutations([chrm(), srgb()]));
  cases.push(...permutations([gamma(), chrm(), srgb()]));
  for (const color of [0, 2, 4, 6]) {
    for (const extras of cases) {
      const source = png16(color, extras);
      const result = await preparePngNormalization(source);
      assert.deepEqual(Buffer.from(result.bytes), source);
      assert.notEqual(result.bytes.buffer, source.buffer);
      assert.ok(Object.isFrozen(result.metadata));
      assert.deepEqual(Object.keys(result), ["bytes", "metadata"]);
    }
  }
});

test("exact positive gamma and conservative cHRM integer boundaries are eligible without sRGB", async () => {
  for (const value of [1, 100000, 0x7fffffff]) await preparePngNormalization(png16(2, [gamma(value)]));
  const bounds = [0, 100000, 99999, 1, 0, 1, 50000, 50000];
  for (const extras of [[chrm(bounds)], [gamma(2), chrm(bounds)], [chrm(bounds), gamma(2)]])
    await preparePngNormalization(png16(2, extras));
});

test("sRGB conflicts reject in every declaration order rather than laundering ignored declarations", async () => {
  const different = [...standard];
  different[0] = 31271;
  for (const declarations of [
    [gamma(45454), chrm(), srgb()],
    [gamma(), chrm(different), srgb()],
  ]) {
    for (const extras of permutations(declarations))
      await rejection(() => preparePngNormalization(png16(2, extras)), "PNG_DATA");
  }
  for (const extras of [...permutations([gamma(1), srgb()]), ...permutations([chrm(different), srgb()])])
    await rejection(() => preparePngNormalization(png16(2, extras)), "PNG_DATA");
});

async function rejectMalformedDeclarations(): Promise<void> {
  for (const extras of [
    [chunk("gAMA")],
    [chunk("gAMA", Buffer.alloc(3))],
    [chunk("gAMA", Buffer.alloc(5))],
    [chunk("cHRM")],
    [chunk("cHRM", Buffer.alloc(31))],
    [chunk("cHRM", Buffer.alloc(33))],
    [gamma(0x80000000)],
    [gamma(0xffffffff)],
    [gamma(), gamma()],
    [chrm(), chrm()],
    [chunk("gAMA", Buffer.alloc(64))],
    [chunk("cHRM", Buffer.from("ParserState".repeat(8)))],
    Array.from({ length: 4090 }, () => gamma()),
    Array.from({ length: 4090 }, () => chrm()),
  ])
    await rejection(() => preparePngNormalization(png16(2, extras)), "PNG_DATA");
  for (let index = 0; index < 8; index++) {
    const values = [...standard];
    for (const value of [0x80000000, 0xffffffff]) {
      values[index] = value;
      await rejection(() => preparePngNormalization(png16(2, [chrm(values)])), "PNG_DATA");
    }
  }
  for (const type of ["gAMA", "cHRM"]) {
    const corrupt = type === "gAMA" ? gamma() : chrm();
    corrupt[corrupt.length - 1] = corrupt[corrupt.length - 1]! ^ 1;
    await rejection(() => preparePngNormalization(png16(2, [corrupt])), "PNG_DATA");
  }
}

async function rejectProfileAndOrder(): Promise<void> {
  await rejection(() => preparePngNormalization(png16(2, [gamma(0)])), "PNG_PROFILE");
  for (const pair of [
    [0, 0],
    [100001, 1],
    [1, 100001],
    [50000, 50001],
    [100000, 1],
    [0x7fffffff, 1],
  ]) {
    for (let index = 0; index < 8; index += 2) {
      const values = [...standard];
      values.splice(index, 2, ...pair);
      await rejection(() => preparePngNormalization(png16(2, [chrm(values)])), "PNG_PROFILE");
    }
  }
  const data = chunk("IDAT", deflateSync(rows16(2)));
  for (const metadata of [gamma(), chrm(), srgb()]) {
    for (const parts of [
      [chunk("PLTE", Buffer.from([1, 2, 3])), metadata, data],
      [data, metadata],
    ])
      await rejection(
        () => preparePngNormalization(container(header(2, 2, 5, 16), ...parts, chunk("IEND"))),
        "PNG_DATA",
      );
  }
  for (const type of ["iCCP", "cICP", "mDCV", "cLLI", "acTL", "eXIf", "vpAg"])
    await rejection(() => preparePngNormalization(png16(2, [gamma(), chrm(), chunk(type)])), "PNG_PROFILE");
}

test("malformed/domain/placement/profile metadata failures precede any decompressor allocation", async () => {
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
      await rejectMalformedDeclarations();
      await rejectProfileAndOrder();
      assert.equal(calls, 0);
      await preparePngNormalization(png16(2, [gamma(), chrm()]));
      assert.equal(calls, 1);
    },
  );
});

test("claims and failures are invocation-local; snapshot guards survive mutation during inflation", async () => {
  const source = png16(2, [gamma(), chrm(), srgb()]);
  const original = Buffer.from(source);
  const pending = preparePngNormalization(source);
  source.fill(0);
  const results = await Promise.all([
    pending,
    preparePngNormalization(png16(2, [gamma(1)])),
    preparePngNormalization(png16(2, [srgb()])),
  ]);
  assert.deepEqual(Buffer.from(results[0]!.bytes), original);
  await rejection(() => preparePngNormalization(png16(2, [gamma(1), srgb()])), "PNG_DATA");
  await preparePngNormalization(original);
  await preparePngNormalization(png16(2, [gamma(1), chrm()]));
  await rejection(() => preparePngNormalization(png16(2, [gamma(), gamma()])), "PNG_DATA");
  await preparePngNormalization(png16(2, [chrm(), srgb(), gamma()]));
});

test("native profile retains 8-bit color-metadata rejection and IHDR-first 16-bit rejection", async () => {
  for (const metadata of [gamma(), chrm()]) {
    await rejection(() => preparePng(fixture(6, undefined, [metadata])), "PNG_PROFILE");
    await rejection(() => preparePng(png16(2, [metadata])), "PNG_PROFILE");
  }
  await rejection(() => preparePng(png16(2, [declaration("gAMA", [0xffffffff])])), "PNG_PROFILE");
  await preparePng(fixture());
});
