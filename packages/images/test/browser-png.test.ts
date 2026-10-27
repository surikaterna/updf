import assert from "node:assert/strict";
import test from "node:test";
import { browserPngImages } from "../src/browser-png.js";
import { selectedFormat } from "../src/format-handler.js";
import { fixture, rejection, chunk } from "../../png/test/helpers.js";
import { png16 } from "../../png/test/normalization-fixture.js";
import { deferred, withBrowser } from "./browser-png-fixture.js";

const format = () => selectedFormat(browserPngImages());
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

test("browser leaf factory is Node-safe, strictly zero-argument and 8-bit stays native", async () => {
  assert.throws(() => Reflect.apply(browserPngImages, undefined, [undefined]));
  const native = await format().prepare(fixture());
  assert.ok(native.metadata && typeof native.metadata === "object" && "width" in native.metadata);
  assert.equal(native.metadata.width, 2);
  await rejection(() => format().prepare(png16()), "PNG_PLATFORM");
});

test("eligibility and pre-abort reject before any browser work; never catch PROFILE into fallback", async () => {
  await withBrowser(async ({ state }) => {
    await rejection(() => format().prepare(png16(6, [chunk("iCCP")])), "PNG_PROFILE");
    const crc = png16();
    crc[29] = crc[29]! ^ 1;
    await rejection(() => format().prepare(crc), "PNG_DATA");
    await rejection(
      () => format().prepare(fixture(6, undefined, [chunk("gAMA", Buffer.from([0, 0, 177, 143]))])),
      "PNG_PROFILE",
    );
    await rejection(() => format().prepare(png16(), AbortSignal.abort()), "PNG_ABORT");
    assert.equal(state.decodes, 0);
  });
});

test("pending decode abort rejects promptly and closes a late bitmap exactly once", async () => {
  await withBrowser(async ({ host, bitmap, state }) => {
    const pending = deferred<typeof bitmap>();
    const started = deferred<void>();
    host.createImageBitmap = () => {
      started.resolve();
      return pending.promise;
    };
    const controller = new AbortController();
    const result = format().prepare(png16(), controller.signal);
    await started.promise;
    controller.abort();
    await rejection(() => result, "PNG_ABORT");
    pending.resolve(bitmap);
    await tick();
    assert.equal(state.closes, 1);
    assert.equal(state.draws, 0);
  });
});

test("pending encode abort releases canvas and bitmap; late blob is never read", async () => {
  await withBrowser(async ({ canvas, blob, state }) => {
    const pending = deferred<typeof blob>();
    const started = deferred<void>();
    canvas.convertToBlob = () => {
      started.resolve();
      return pending.promise;
    };
    const controller = new AbortController();
    const result = format().prepare(png16(), controller.signal);
    await started.promise;
    controller.abort();
    await rejection(() => result, "PNG_ABORT");
    pending.resolve(blob);
    await tick();
    assert.equal(state.closes, 1);
    assert.equal(canvas.width, 0);
    assert.equal(canvas.height, 0);
    assert.equal(state.reads, 0);
  });
});

test("pending blob read abort releases resources without native preparation", async () => {
  await withBrowser(async ({ blob, canvas, state }) => {
    const pending = deferred<ArrayBuffer>();
    const started = deferred<void>();
    blob.arrayBuffer = () => {
      started.resolve();
      return pending.promise;
    };
    const controller = new AbortController();
    const result = format().prepare(png16(), controller.signal);
    await started.promise;
    controller.abort();
    await rejection(() => result, "PNG_ABORT");
    pending.resolve(new ArrayBuffer(0));
    await tick();
    assert.equal(state.closes, 1);
    assert.equal(canvas.width, 0);
  });
});

test("wrong bitmap dimensions fail before canvas drawing and release the bitmap", async () => {
  await withBrowser(async ({ bitmap, state }) => {
    bitmap.width = 3;
    await rejection(() => format().prepare(png16()), "PNG_DATA");
    assert.equal(state.closes, 1);
    assert.equal(state.draws, 0);
  });
});

test("encoded MIME/size are validated before arrayBuffer; returned size and native CRC are mandatory", async () => {
  await withBrowser(async ({ blob, state }) => {
    for (const size of [0, NaN, 8 * 1024 * 1024 + 1]) {
      blob.size = size;
      await rejection(() => format().prepare(png16()), size > 0 ? "LIMIT" : "PNG_DATA");
    }
    blob.size = 10;
    blob.type = "image/jpeg";
    await rejection(() => format().prepare(png16()), "PNG_DATA");
    assert.equal(state.reads, 0);
    blob.type = "image/png";
    await rejection(() => format().prepare(png16()), "PNG_DATA");
    const bad = fixture();
    bad[29] = bad[29]! ^ 1;
    blob.size = bad.length;
    blob.arrayBuffer = async () => Uint8Array.from(bad).buffer;
    await rejection(() => format().prepare(png16()), "PNG_DATA");
    assert.equal(state.closes, 6);
  });
});
