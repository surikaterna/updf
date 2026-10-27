import assert from "node:assert/strict";
import test from "node:test";
import { png16 } from "../../png/test/normalization-fixture.js";
import { rejection } from "../../png/test/helpers.js";
import { browserPngImages } from "../src/browser-png.js";
import { selectedFormat } from "../src/format-handler.js";
import { withBrowser } from "./browser-png-fixture.js";
import { hostResult } from "../src/browser-png-await.js";
import { images } from "../src/load.js";
import { pngImages } from "../src/png.js";

const format = () => selectedFormat(browserPngImages());

test("browser failures and encoded dimension changes cannot publish resources; every acquired handle closes", async () => {
  await withBrowser(async ({ canvas, state, host }) => {
    await rejection(() => format().prepare(png16()), "PNG_DATA");
    assert.equal(state.closes, 1);
    canvas.getContext = () => {
      throw Error("draw failure");
    };
    await rejection(() => format().prepare(png16()), "PNG_PLATFORM");
    assert.equal(state.closes, 2);
    assert.equal(canvas.width, 0);
    host.createImageBitmap = async () => {
      throw Error("decode failure");
    };
    await rejection(() => format().prepare(png16()), "PNG_PLATFORM");
    assert.equal(state.closes, 2);
  });
});

test("strict browser format cannot coexist with portable PNG and rejects before transport", () => {
  assert.throws(() =>
    images({
      loader: { resolve: () => "", load: async () => new Uint8Array() },
      formatHandlers: [pngImages(), browserPngImages()],
    }),
  );
});

test("DOM null context, drawing exception and null toBlob fail clearly with cleanup", async () => {
  await withBrowser(async ({ canvas, state, blob }) => {
    Object.assign(canvas, { getContext: () => null });
    await rejection(() => format().prepare(png16()), "PNG_PLATFORM");
    Object.assign(canvas, {
      getContext: () => ({
        drawImage: () => {
          throw Error("drawing");
        },
      }),
    });
    await rejection(() => format().prepare(png16()), "PNG_PLATFORM");
    Object.assign(canvas, {
      getContext: () => ({ drawImage: () => {} }),
      convertToBlob: undefined,
      toBlob: (callback: (value: typeof blob | null) => void) => callback(null),
    });
    await rejection(() => format().prepare(png16()), "PNG_PLATFORM");
    assert.equal(state.closes, 3);
    assert.equal(canvas.width, 0);
    assert.equal(canvas.height, 0);
  });
});

test("browser decoding receives the validator snapshot, never mutated caller storage", async () => {
  await withBrowser(async ({ host, bitmap }) => {
    const bytes = png16();
    const expected = Buffer.from(bytes);
    let actual: Uint8Array | undefined;
    host.createImageBitmap = async (input) => {
      assert.ok(input instanceof Blob);
      actual = new Uint8Array(await input.arrayBuffer());
      return bitmap;
    };
    const result = format().prepare(bytes);
    bytes.fill(0);
    await rejection(() => result, "PNG_DATA");
    assert.deepEqual(actual, new Uint8Array(expected));
  });
});

test("host await removes listeners on success, failure and cancellation, consuming late failures", async () => {
  const listeners = new Set<() => void>();
  const signal = {
    aborted: false,
    addEventListener: (_type: "abort", listener: () => void) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: "abort", listener: () => void) => {
      listeners.delete(listener);
    },
  };
  assert.equal(await hostResult(Promise.resolve(1), signal), 1);
  assert.equal(listeners.size, 0);
  await assert.rejects(hostResult(Promise.reject(Error("native")), signal));
  assert.equal(listeners.size, 0);
  let reject!: (error: unknown) => void;
  const pending = hostResult(
    new Promise((_yes, no) => {
      reject = no;
    }),
    signal,
  );
  signal.aborted = true;
  for (const listener of listeners) listener();
  await rejection(() => pending, "PNG_ABORT");
  reject(Error("late native rejection"));
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(listeners.size, 0);
});
