import assert from "node:assert/strict";
import test from "node:test";
import { deflateSync } from "node:zlib";
import { pngProvider, preparePng } from "@updf/png";
import { render } from "@updf/core";
import { ownedResourceBytes } from "@updf/core/resources";
import { decode } from "../src/decode.js";
import { parse } from "../src/parser.js";
import { transcode } from "../src/streams.js";
import { chunk, container, document, fixture, header, rejection } from "./helpers.js";
import { canonicalPngPdf } from "../../../tests/fixtures/png/pdf-equivalence.js";

async function withCodec(name: "CompressionStream" | "DecompressionStream", value: unknown, run: () => Promise<void>) {
  const original = Object.getOwnPropertyDescriptor(globalThis, name)!;
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  try {
    await run();
  } finally {
    Object.defineProperty(globalThis, name, original);
  }
}

test("both native codecs are required; missing or unsupported platforms reject without a fallback", async () => {
  for (const name of ["CompressionStream", "DecompressionStream"] as const) {
    await withCodec(name, undefined, () => rejection(() => preparePng(fixture()), "PNG_PLATFORM"));
    await withCodec(
      name,
      class {
        constructor() {
          throw new Error("unsupported");
        }
      },
      () => rejection(() => preparePng(fixture()), "PNG_PLATFORM"),
    );
  }
});

test("native zlib validates truncation, trailing data, Adler-32 and stored-block complements", async () => {
  const compressed = deflateSync(Buffer.from([0, 1, 2, 0, 3, 4]), { level: 0 });
  const badLength = Buffer.from(compressed);
  badLength[5] = badLength[5]! ^ 1;
  const badAdler = Buffer.from(compressed);
  badAdler[badAdler.length - 1] = badAdler[badAdler.length - 1]! ^ 1;
  const invalid = [badLength, badAdler, Buffer.concat([compressed, Buffer.from([0])])];
  for (let end = 0; end < compressed.length; end++) invalid.push(compressed.subarray(0, end));
  for (const bytes of invalid)
    await rejection(() => preparePng(container(header(0), chunk("IDAT", bytes), chunk("IEND"))), "PNG_DATA");
});

test("preparation is async, snapshots before suspension, and charges exact retained streams plus source", async () => {
  const source = fixture();
  const original = Buffer.from(source);
  const pending = preparePng(source);
  assert.ok(pending instanceof Promise);
  source.fill(0);
  const image = await pending;
  const decoded = await decode(parse(original));
  assert.equal(ownedResourceBytes(image), original.length + decoded.pixels.length + decoded.alpha!.length);
  assert.equal(image.metadata.width, 2);
});

test("aborts and malformed options reject without publishing handles or running option getters", async () => {
  const abort = new AbortController();
  abort.abort();
  await rejection(() => preparePng(fixture(), { signal: abort.signal }), "PNG_ABORT");
  await rejection(
    () =>
      preparePng(fixture(), {
        get signal(): never {
          throw new Error("getter ran");
        },
      }),
    "TYPE",
  );
  for (const options of [null, [], { unknown: true }, { signal: undefined }, { signal: null }, { signal: {} }])
    await rejection(() => preparePng(fixture(), options as never), "TYPE");
});

function stub(output: Uint8Array | undefined) {
  const counts = { cancelled: 0, aborted: 0, released: 0, reads: 0 };
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

test("stream size/read caps cancel both sides and release locks before retaining excess output", async () => {
  for (const output of [new Uint8Array(5), new Uint8Array(0)]) {
    const { Stream, counts } = stub(output);
    await withCodec("DecompressionStream", Stream, async () => {
      await rejection(
        () => transcode(new Uint8Array(1), 4, "DecompressionStream"),
        output.length ? "PNG_DATA" : "LIMIT",
      );
    });
    assert.deepEqual(counts, { cancelled: 1, aborted: 1, released: 2, reads: output.length ? 1 : 65536 });
  }
});

test("in-flight cancellation settles stalled native work and removes abort listeners", async () => {
  for (const direction of ["CompressionStream", "DecompressionStream"] as const) {
    const { Stream, counts } = stub(undefined);
    await withCodec(direction, Stream, async () => {
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
      const pending = transcode(new Uint8Array(1), 4, direction, signal);
      controller.abort();
      await rejection(() => pending, "PNG_ABORT");
      assert.equal(added, 1);
      assert.equal(removed, 1);
      assert.deepEqual(counts, { cancelled: 1, aborted: 1, released: 2, reads: 1 });
    });
  }
});

test("PDF equivalence accepts different valid compression but rejects changed pixel content", async () => {
  const pdf = async (bytes: Uint8Array) =>
    render(document(), {
      resources: { image: await preparePng(bytes) },
      providers: [pngProvider()],
    });
  const original = await pdf(fixture());
  class StoredStream {
    readonly readable;
    readonly writable;
    constructor() {
      const parts: Uint8Array[] = [];
      const stream = new TransformStream<Uint8Array, Uint8Array>({
        transform(bytes) {
          parts.push(bytes.slice());
        },
        flush(controller) {
          controller.enqueue(deflateSync(Buffer.concat(parts), { level: 0 }));
        },
      });
      this.readable = stream.readable;
      this.writable = stream.writable;
    }
  }
  await withCodec("CompressionStream", StoredStream, async () => {
    const alternative = await pdf(fixture());
    assert.notDeepEqual(alternative, original);
    assert.deepEqual(canonicalPngPdf(alternative), canonicalPngPdf(original));
  });
  const changed = fixture(6, [0, 0, 0, 255, 0, 255, 0, 128, 0, 0, 255, 0, 255, 255, 0, 255]);
  assert.notDeepEqual(canonicalPngPdf(await pdf(changed)), canonicalPngPdf(original));
});
