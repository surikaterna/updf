import assert from "node:assert/strict";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { preparePngNormalization } from "@updf/png/normalization";
import { png16, withCodec } from "./normalization-fixture.js";
import { rejection } from "./helpers.js";

test("snapshot precedes suspension; parallel validations return separate caller-owned bytes", async () => {
  const source = png16();
  const original = new Uint8Array(source);
  const first = preparePngNormalization(source);
  const second = preparePngNormalization(source);
  source.fill(0);
  const [a, b] = await Promise.all([first, second]);
  assert.deepEqual(a.bytes, original);
  assert.deepEqual(b.bytes, original);
  assert.notEqual(a.bytes.buffer, b.bytes.buffer);
  a.bytes.fill(0);
  assert.deepEqual(b.bytes, original);
  assert.equal(b.metadata.bitDepth, 16);
  assert.ok(source.every((byte) => byte === 0));
});

test("byte ownership uses intrinsic view copying, accepting cross-realm views but rejecting unsafe inputs", async () => {
  const source = png16();
  const foreign = runInNewContext("Uint8Array.from(values)", { values: [...source] });
  assert.deepEqual((await preparePngNormalization(foreign)).bytes, new Uint8Array(source));
  Object.defineProperties(source, {
    slice: {
      value: () => {
        throw new Error("slice override");
      },
    },
    buffer: {
      get: () => {
        throw new Error("buffer getter");
      },
    },
    byteLength: {
      get: () => {
        throw new Error("length getter");
      },
    },
  });
  assert.equal((await preparePngNormalization(source)).metadata.width, 2);
  for (const input of [
    null,
    undefined,
    [],
    {},
    new Uint16Array(10),
    new Proxy(png16(), {}),
    new Uint8Array(new SharedArrayBuffer(10)),
  ]) {
    await rejection(() => preparePngNormalization(input as never), "TYPE");
  }
  const detached = new Uint8Array(10);
  structuredClone(detached, { transfer: [detached.buffer] });
  await rejection(() => preparePngNormalization(detached), "PNG_DATA");
});

test("strict options and pre-abort reject before codec use without invoking option getters", async () => {
  let allocations = 0;
  await withCodec(
    "DecompressionStream",
    class {
      constructor() {
        allocations++;
        throw new Error("unexpected codec");
      }
    },
    async () => {
      const controller = new AbortController();
      controller.abort();
      await rejection(() => preparePngNormalization(png16(), { signal: controller.signal }), "PNG_ABORT");
      for (const options of [
        null,
        [],
        { unknown: true },
        { signal: undefined },
        { signal: null },
        { signal: {} },
        { [Symbol()]: true },
      ]) {
        await rejection(() => preparePngNormalization(png16(), options as never), "TYPE");
      }
      await rejection(
        () =>
          preparePngNormalization(png16(), {
            get signal(): never {
              throw new Error("getter ran");
            },
          }),
        "TYPE",
      );
      assert.equal(allocations, 0);
    },
  );
  assert.equal((await preparePngNormalization(png16(), Object.create(null))).metadata.width, 2);
});

function codecStub(output?: Uint8Array) {
  const counts = { reads: 0, cancelled: 0, aborted: 0, released: 0 };
  class Stream {
    readable = {
      getReader: () => ({
        read: () => {
          counts.reads++;
          return output ? Promise.resolve({ done: false, value: output }) : new Promise(() => {});
        },
        cancel: async () => {
          counts.cancelled++;
        },
        releaseLock: () => {
          counts.released++;
        },
      }),
    };
    writable = {
      getWriter: () => ({
        write: async () => {},
        close: async () => {},
        abort: async () => {
          counts.aborted++;
        },
        releaseLock: () => {
          counts.released++;
        },
      }),
    };
  }
  return { Stream, counts };
}

test("eligibility reuses stream output/read bounds and releases failed native work", async () => {
  for (const output of [new Uint8Array(1000), new Uint8Array(0)]) {
    const { Stream, counts } = codecStub(output);
    await withCodec("DecompressionStream", Stream, async () => {
      await rejection(() => preparePngNormalization(png16()), output.length ? "PNG_DATA" : "LIMIT");
    });
    assert.deepEqual(counts, { reads: output.length ? 1 : 65536, cancelled: 1, aborted: 1, released: 2 });
  }
});

test("structural in-flight abort settles stalled work, releases locks and removes its listener", async () => {
  const { Stream, counts } = codecStub();
  const controller = new AbortController();
  let added = 0,
    removed = 0;
  const signal = {
    get aborted() {
      return controller.signal.aborted;
    },
    addEventListener(type: "abort", listener: () => void) {
      added++;
      controller.signal.addEventListener(type, listener);
    },
    removeEventListener(type: "abort", listener: () => void) {
      removed++;
      controller.signal.removeEventListener(type, listener);
    },
  };
  await withCodec("DecompressionStream", Stream, async () => {
    const pending = preparePngNormalization(png16(), { signal });
    controller.abort();
    await rejection(() => pending, "PNG_ABORT");
  });
  assert.equal(added, 1);
  assert.equal(removed, 1);
  assert.deepEqual(counts, { reads: 1, cancelled: 1, aborted: 1, released: 2 });
});

test("successful and invalid real native inflations release locks and listeners", async () => {
  const streams: DecompressionStream[] = [];
  const Native = globalThis.DecompressionStream;
  const controller = new AbortController();
  let added = 0,
    removed = 0;
  const signal = {
    get aborted() {
      return controller.signal.aborted;
    },
    addEventListener(type: "abort", listener: () => void) {
      added++;
      controller.signal.addEventListener(type, listener);
    },
    removeEventListener(type: "abort", listener: () => void) {
      removed++;
      controller.signal.removeEventListener(type, listener);
    },
  };
  await withCodec(
    "DecompressionStream",
    class extends Native {
      constructor() {
        super("deflate");
        streams.push(this);
      }
    },
    async () => {
      await preparePngNormalization(png16(), { signal });
      await rejection(() => preparePngNormalization(png16(0, [], Buffer.from([0])), { signal }), "PNG_DATA");
    },
  );
  assert.equal(added, 2);
  assert.equal(removed, 2);
  assert.equal(streams.length, 2);
  for (const stream of streams) assert.ok(!stream.readable.locked && !stream.writable.locked);
});
