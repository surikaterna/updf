import assert from "node:assert/strict";
import test from "node:test";
import { createImageCache } from "../src/cache.js";
import { captureOptions } from "../src/load-options.js";
import { imageSession } from "../src/load-session.js";
import { pngImages } from "../src/png.js";
import { fixture } from "../../png/test/helpers.js";
import { deferred, flush } from "./cache-helpers.js";

test("closing a no-signal session removes unsettled claims without pretending ignored-abort work settled", async () => {
  const pending = deferred<Uint8Array<ArrayBuffer>>();
  let signal: { readonly aborted: boolean } | undefined;
  const cache = createImageCache({ maxEntries: 1, maxBytes: 1000, maxConsumers: 1 });
  const config = captureOptions({
    cache,
    formatHandlers: [pngImages()],
    loader: {
      resolve: (url) => url,
      load: (_uri, options) => {
        signal = options?.signal;
        return pending.promise;
      },
    },
  });
  const session = imageSession(config, {
    resourceBytes: 1000,
    remaining: () => 1000,
    check() {},
    appendProvider() {},
    retain: () => assert.fail("This session does not retain stage resources"),
  });
  const result = assert.rejects(session.resolve("logo"));
  await flush();
  session.close();
  await result;
  assert.equal(signal?.aborted, true);
  assert.deepEqual(cache.snapshot(), { entries: 0, pending: 1, consumers: 0, accountedBytes: 8, disposed: false });
  pending.resolve(new Uint8Array(fixture()));
  await flush();
  assert.deepEqual(cache.snapshot(), { entries: 0, pending: 0, consumers: 0, accountedBytes: 0, disposed: false });
});

test("close after publication but before session continuation rejects without rewinding retained preparation", async () => {
  const cache = createImageCache({ maxEntries: 1, maxBytes: 1000, maxConsumers: 1 });
  let close = () => {};
  const signal = {
    aborted: false,
    addEventListener() {},
    removeEventListener() {
      assert.equal(cache.snapshot().entries, 1);
      close();
    },
  };
  const config = captureOptions({
    cache,
    formatHandlers: [pngImages()],
    loader: { resolve: (url) => url, load: async () => new Uint8Array(fixture()) },
  });
  const session = imageSession(config, {
    signal,
    resourceBytes: 1000,
    remaining: () => 1000,
    check() {},
    appendProvider() {},
    retain: () => assert.fail("This session does not retain stage resources"),
  });
  close = session.close;
  await assert.rejects(session.resolve("logo"), /session closed/u);
  assert.deepEqual(cache.snapshot(), { entries: 1, pending: 0, consumers: 0, accountedBytes: 116, disposed: false });
});
