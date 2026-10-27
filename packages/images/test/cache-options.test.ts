import assert from "node:assert/strict";
import test from "node:test";
import { createImageCache } from "@updf/images/cache";
import { pngImages } from "@updf/images/png";
import { controlled, code, render } from "./cache-helpers.js";

test("portable proxy options snapshot descriptor numbers once without later reflection", async () => {
  const target = { maxEntries: 1, maxBytes: 8, maxConsumers: 1 };
  let descriptors = 0;
  const options = new Proxy(target, {
    getOwnPropertyDescriptor(object, key) {
      descriptors++;
      return Reflect.getOwnPropertyDescriptor(object, key);
    },
  });
  const cache = createImageCache(options);
  const captured = descriptors;
  assert.equal(captured, 6);
  Object.assign(target, { maxEntries: 100, maxBytes: 100000, maxConsumers: 100 });
  const state = controlled();
  const config = { loader: state.config.loader, formatHandlers: [pngImages()], cache };
  const first = render(config);
  await assert.rejects(render(config), code("LIMIT"));
  await assert.rejects(render(config, ["other"]), code("LIMIT"));
  assert.equal(state.jobs.length, 1);
  state.complete(0);
  await first;
  assert.equal(cache.snapshot().entries, 0);
  await assert.rejects(render(config, ["longer"]), code("LIMIT"));
  assert.equal(descriptors, captured);
});

test("proxy accessor descriptors reject without invoking getters; revoked reflection may throw", () => {
  let getters = 0;
  const target = { maxEntries: 1, maxBytes: 100, maxConsumers: 1 };
  const options = new Proxy(target, {
    getOwnPropertyDescriptor(object, key) {
      if (key !== "maxBytes") return Reflect.getOwnPropertyDescriptor(object, key);
      return { configurable: true, enumerable: true, get: () => ++getters };
    },
  });
  assert.throws(() => createImageCache(options), code("TYPE"));
  assert.equal(getters, 0);
  const revoked = Proxy.revocable(target, {});
  revoked.revoke();
  assert.throws(() => createImageCache(revoked.proxy), TypeError);
  class Limits {
    maxEntries = 1;
    maxBytes = 100;
    maxConsumers = 1;
  }
  assert.throws(() => createImageCache(new Limits()), code("TYPE"));
  assert.throws(() => createImageCache({ ...target, maxBytes: undefined } as never), code("VALUE"));
});
