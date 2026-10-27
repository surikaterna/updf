import assert from "node:assert/strict";
import test from "node:test";
import { h } from "@updf/core/vdom";
import { Image } from "@updf/images";
import { createAssetLoader, images } from "@updf/images/load";
import { pngImages } from "@updf/images/png";
import { renderAsync } from "@updf/layout/async";
import { authored } from "../../layout/test/preparation-fixture.js";
import { container, header, chunk, fixture } from "../../png/test/helpers.js";
import { transport } from "./url-helpers.js";

const tree = () => authored(h(Image, { src: "logo", style: { width: 20, height: 20 } }));

test("abort during streaming cancels/releases the asset reader and a fresh render has fresh session state", async () => {
  let entered!: () => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  let cancelled = 0,
    released = 0,
    calls = 0;
  const controller = new AbortController();
  const loader = createAssetLoader({
    baseURI: "https://fixture.invalid/",
    fetch: async () => {
      calls++;
      if (calls > 1) return new Response(new Uint8Array(fixture()));
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        body: {
          getReader: () => ({
            read() {
              entered();
              return new Promise<never>(() => {});
            },
            async cancel() {
              cancelled++;
            },
            releaseLock() {
              released++;
            },
          }),
        },
      };
    },
  });
  const options = { extensions: [images({ loader, formatHandlers: [pngImages()] })] };
  const pending = renderAsync(tree(), options, { signal: controller.signal });
  await started;
  controller.abort();
  await assert.rejects(pending, /aborted/u);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(cancelled, 1);
  assert.equal(released, 1);
  assert.ok((await renderAsync(tree(), options)).length > 100);
  assert.equal(calls, 2);
});

test("late custom transport success/rejection after abort is consumed and cannot publish a PDF", async () => {
  for (const rejectLate of [false, true]) {
    let settle!: (value: Uint8Array<ArrayBuffer>) => void;
    let reject!: (error: Error) => void;
    let entered!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const loader = {
      resolve: (url: string) => url,
      load: () => {
        entered();
        return new Promise<Uint8Array<ArrayBuffer>>((yes, no) => {
          settle = yes;
          reject = no;
        });
      },
    };
    const controller = new AbortController();
    const pending = renderAsync(
      tree(),
      { extensions: [images({ loader, formatHandlers: [pngImages()] })] },
      { signal: controller.signal },
    );
    await started;
    controller.abort();
    await assert.rejects(pending, /aborted/u);
    if (rejectLate) reject(new Error("late failure"));
    else settle(new Uint8Array(fixture()));
    await new Promise((resolve) => setImmediate(resolve));
  }
});

test("selected signatures reject unknown/truncated/16-bit PNG without fallback; source budget rejects before fetch", async () => {
  for (const bytes of [
    new Uint8Array([1, 2, 3]),
    new Uint8Array([137, 80]),
    container(header(6, 2, 2, 16), chunk("IDAT"), chunk("IEND")),
  ]) {
    const { loader } = transport(bytes);
    await assert.rejects(renderAsync(tree(), { extensions: [images({ loader, formatHandlers: [pngImages()] })] }));
  }
  const { loader, calls } = transport();
  await assert.rejects(
    renderAsync(tree(), { limits: { nodes: 1 }, extensions: [images({ loader, formatHandlers: [pngImages()] })] }),
    /limit/iu,
  );
  assert.equal(calls.fetch, 0);
});
