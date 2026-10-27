import assert from "node:assert/strict";
import test from "node:test";
import { preparePng, pngProvider } from "@updf/png";
import { createOwnedResource } from "@updf/core/resources";
import { h } from "@updf/core/vdom";
import { Image, images as preparedImages } from "@updf/images";
import { images } from "@updf/images/load";
import { pngImages } from "@updf/images/png";
import { renderAsync } from "@updf/layout/async";
import { authored } from "../../layout/test/preparation-fixture.js";
import { CacheBackend } from "../src/cache-backend.js";
import { fixture } from "../../png/test/helpers.js";
import { transport } from "./url-helpers.js";
import { cache, deferred, flush, image, render } from "./cache-helpers.js";
import type { PreparedJobResult } from "../src/prepared-job.js";

const policy = { receiver: {}, resolve: () => {}, load: () => {}, handlers: [{}] };

test("actual render failure after valid PNG retains preparation, not a PDF transaction", async () => {
  const actual = transport();
  let resolves = 0;
  const loader = {
    ...actual.loader,
    resolve(url: string) {
      resolves++;
      if (url === "later-denied") throw Error("denied");
      return actual.loader.resolve(url);
    },
  };
  const config = { loader, formatHandlers: [pngImages()], cache: cache() };
  await assert.rejects(render(config, ["logo", "later-denied"]), /denied/u);
  assert.deepEqual(config.cache.snapshot(), {
    entries: 1,
    pending: 0,
    consumers: 0,
    accountedBytes: 176,
    disposed: false,
  });
  assert.ok((await render(config)).length > 100);
  assert.equal(actual.calls.fetch, 1);
  assert.equal(resolves, 3);
});

test("last release after upstream fulfillment but before settlement observer prevents publication", async () => {
  const backend = new CacheBackend(1, 1000, 2);
  const value = { resource: await preparePng(fixture()), sourceBytes: 78 };
  const pending = deferred<Readonly<PreparedJobResult>>();
  const claim = backend.acquire(policy, "a", 100, undefined, () => pending.promise);
  const rejected = assert.rejects(claim.result);
  await flush();
  pending.resolve(value);
  claim.release();
  assert.equal(backend.snapshot().pending, 1);
  assert.equal(backend.snapshot().consumers, 0);
  await rejected;
  await flush();
  assert.equal(backend.snapshot().entries, 0);
  assert.equal(backend.snapshot().accountedBytes, 0);
});

test("publication precedes caller continuation and subsequent release cannot rewind it", async () => {
  const backend = new CacheBackend(1, 1000, 1);
  const value = { resource: await preparePng(fixture()), sourceBytes: 78 };
  const controller = new AbortController();
  const claim = backend.acquire(policy, "a", 100, controller.signal, async () => value);
  await claim.result.then(() => {
    assert.equal(backend.snapshot().entries, 1);
    assert.equal(backend.snapshot().consumers, 0);
    controller.abort();
    claim.release();
  });
  assert.equal(backend.peek(policy, "a")?.resource, value.resource);
});

test("invalid source accounting never publishes an authentic PNG", async () => {
  const backend = new CacheBackend(1, 1000, 1);
  const resource = await preparePng(fixture());
  for (const sourceBytes of [-1, 0.5, NaN, Infinity, 101]) {
    const claim = backend.acquire(policy, "a", 100, undefined, async () => ({ resource, sourceBytes }));
    await assert.rejects(claim.result);
    assert.equal(backend.snapshot().entries, 0);
  }
});

test("capture failure starts no job and leaves unrelated retained entries unchanged", async () => {
  const actual = transport();
  const config = { loader: actual.loader, formatHandlers: [pngImages()], cache: cache() };
  const invalid = authored([
    image("logo"),
    h(Image, { src: "bad", fit: "invalid" as "fill", style: { width: 20, height: 20 } }),
  ]);
  await assert.rejects(renderAsync(invalid, { extensions: [images(config)] }));
  assert.equal(actual.calls.fetch, 0);
  assert.equal(config.cache.snapshot().entries, 0);
  await render(config);
  const snapshot = config.cache.snapshot();
  await assert.rejects(renderAsync(invalid, { extensions: [images(config)] }));
  assert.deepEqual(config.cache.snapshot(), snapshot);
  assert.equal(actual.calls.fetch, 1);
});

test("late layout failure returns no PDF but retains an already prepared image", async () => {
  const actual = transport();
  const config = { loader: actual.loader, formatHandlers: [pngImages()], cache: cache() };
  await assert.rejects(
    renderAsync(authored(image()), {
      extensions: [images(config)],
      limits: { pages: 0 },
    }),
  );
  assert.equal(config.cache.snapshot().entries, 1);
  assert.ok((await render(config)).length > 100);
  assert.equal(actual.calls.fetch, 1);
});

test("load, signature and codec failures publish no cache entry", async () => {
  for (const load of [
    async () => {
      throw Error("load failed");
    },
    async () => new Uint8Array([1, 2, 3]),
    async () => new Uint8Array(fixture()).slice(0, 8),
  ]) {
    const config = { loader: { resolve: (url: string) => url, load }, formatHandlers: [pngImages()], cache: cache() };
    await assert.rejects(render(config));
    assert.deepEqual(config.cache.snapshot(), {
      entries: 0,
      pending: 0,
      consumers: 0,
      accountedBytes: 0,
      disposed: false,
    });
  }
});

test("owned metadata validation cannot grant a forged PNG private provider authority", async () => {
  const backend = new CacheBackend(1, 1000, 1);
  const resource = createOwnedResource({ kind: "png" as const, width: 1, height: 1 });
  const claim = backend.acquire(policy, "a", 100, undefined, async () => ({ resource, sourceBytes: 1 }));
  await claim.result;
  assert.equal(backend.peek(policy, "a")?.resource, resource);
  await assert.rejects(
    renderAsync(authored(image(resource)), {
      resources: { forged: resource },
      providers: [pngProvider()],
      extensions: [preparedImages()],
    }),
  );
});
