import assert from "node:assert/strict";
import test from "node:test";
import { createImageCache, type ImageCacheOptions } from "@updf/images/cache";
import { images } from "@updf/images/load";
import { ownedResourceBytes } from "@updf/core/resources";
import { pngImages } from "@updf/images/png";
import { transport } from "./url-helpers.js";
import { cache, code, render, resource } from "./cache-helpers.js";

test("exact required own-data bounds reject accessors, inherited/magic/symbol/extra keys without getters", () => {
  const valid = { maxEntries: 1, maxBytes: 100, maxConsumers: 1 };
  let getters = 0;
  for (const value of [
    undefined,
    null,
    {},
    Object.create(valid),
    { ...valid, extra: 1 },
    { ...valid, [Symbol()]: 1 },
    { ...valid, ["__proto__"]: null },
    {
      ...valid,
      get maxBytes() {
        getters++;
        return 100;
      },
    },
  ])
    assert.throws(() => createImageCache(value as ImageCacheOptions));
  for (const name of Object.keys(valid))
    for (const value of [undefined, null, 0, -1, 0.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1, "1"])
      assert.throws(() => createImageCache({ ...valid, [name]: value } as ImageCacheOptions));
  assert.equal(getters, 0);
  assert.throws(() => Reflect.apply(createImageCache, null, [valid, valid]), code("TYPE"));
  const actual = transport();
  const config = { loader: actual.loader, formatHandlers: [pngImages()] };
  for (const value of [
    undefined,
    null,
    {},
    { ...cache() },
    new Proxy(cache(), {}),
    {
      get snapshot() {
        getters++;
        throw new Error("getter");
      },
    },
  ])
    assert.throws(() => images({ ...config, cache: value } as never), code("TYPE"));
  assert.equal(getters, 0);
});

test("detached methods and frozen exact snapshots contain no key/resource/policy information", () => {
  const { snapshot, clear, dispose } = cache();
  assert.deepEqual(snapshot(), { entries: 0, pending: 0, consumers: 0, accountedBytes: 0, disposed: false });
  assert.ok(Object.isFrozen(snapshot()));
  clear();
  dispose();
  dispose();
  clear();
  assert.equal(snapshot().disposed, true);
});

test("key reservations fail before fetch; resource too large for retention remains a successful uncached image", async () => {
  const { loader, calls } = transport();
  const exactLoader = { ...loader, resolve: (url: string) => url };
  const config = { loader: exactLoader, formatHandlers: [pngImages()], cache: cache({ maxBytes: 7 }) };
  await assert.rejects(render(config), code("LIMIT"));
  assert.equal(calls.fetch, 0);
  const small = { ...config, cache: cache({ maxBytes: 8 }) };
  assert.deepEqual(await render(small), await render(small));
  assert.equal(calls.fetch, 2);
  assert.equal(small.cache.snapshot().accountedBytes, 0);
  assert.equal(small.cache.snapshot().entries, 0);
});

test("owned resource bytes plus UTF16 key are charged exactly and independently for duplicate resources", async () => {
  const actual = transport();
  const loader = { ...actual.loader, resolve: (url: string) => url };
  const base = { loader, formatHandlers: [pngImages()] };
  const src = await resource(base);
  const bytes = ownedResourceBytes(src);
  const config = { ...base, cache: cache({ maxBytes: bytes + 8 }) };
  await render(config);
  assert.equal(config.cache.snapshot().accountedBytes, bytes + 8);
  await render(config);
  assert.equal(actual.calls.fetch, 2);
  const tooSmall = { ...base, cache: cache({ maxBytes: bytes + 7 }) };
  await render(tooSmall);
  assert.equal(tooSmall.cache.snapshot().entries, 0);
  const unicode = { ...base, cache: cache({ maxBytes: bytes + 4 }) };
  await render(unicode, ["😀"]);
  assert.equal(unicode.cache.snapshot().accountedBytes, bytes + 4);
});

test("trusted custom loader's overridden byteLength cannot bypass the source bound before signature or codec", async () => {
  const bytes = new Uint8Array(100);
  Object.defineProperty(bytes, "byteLength", { value: 1 });
  let loads = 0;
  const loader = {
    resolve: (url: string) => url,
    load: async () => {
      loads++;
      return bytes;
    },
  };
  const config = { loader, formatHandlers: [pngImages()], cache: cache() };
  await assert.rejects(render(config, undefined, undefined, 2), code("LIMIT"));
  assert.equal(loads, 1);
  assert.equal(config.cache.snapshot().entries, 0);
});
