import assert from "node:assert/strict";
import test from "node:test";
import { createOwnedResource, ownedResourceBytes } from "@updf/core/resources";
import { preparePng } from "@updf/png";
import { CacheBackend } from "../src/cache-backend.js";
import type { ImagePolicy } from "../src/cache-owner.js";
import { chunk, fixture } from "../../png/test/helpers.js";
import { code, controlled, deferred, flush, render, resource } from "./cache-helpers.js";

const policy: ImagePolicy = { receiver: {}, resolve: () => {}, load: () => {}, handlers: [{}] };

test("removable subscribers balance listeners even for synchronous structural abort during listener attachment", async () => {
  const backend = new CacheBackend(1, 1000, 1);
  let added = 0,
    removed = 0,
    jobs = 0;
  const signal = {
    aborted: false,
    addEventListener(_type: "abort", listener: () => void) {
      added++;
      listener();
    },
    removeEventListener() {
      removed++;
    },
  };
  const claim = backend.acquire(policy, "a", 100, signal, async () => {
    jobs++;
    throw Error("not started");
  });
  await assert.rejects(claim.result);
  await flush();
  assert.equal(jobs, 0);
  assert.equal(added, 1);
  assert.ok(removed >= 1);
  assert.deepEqual(backend.snapshot(), { entries: 0, pending: 0, consumers: 0, accountedBytes: 0, disposed: false });
});

test("saturation adds no listener, one job observer serves released/replaced subscriber records", async () => {
  const backend = new CacheBackend(1, 1000, 1);
  const pending = deferred<{ resource: Awaited<ReturnType<typeof preparePng>>; sourceBytes: number }>();
  const first = backend.acquire(policy, "a", 100, undefined, () => pending.promise);
  let listeners = 0;
  const signal = {
    aborted: false,
    addEventListener() {
      listeners++;
    },
    removeEventListener() {},
  };
  assert.throws(() => backend.acquire(policy, "a", 100, signal, () => pending.promise), code("LIMIT"));
  assert.equal(listeners, 0);
  const rejected = assert.rejects(first.result);
  first.release();
  await rejected;
  assert.equal(backend.snapshot().pending, 1);
  pending.resolve({ resource: await preparePng(fixture()), sourceBytes: 80 });
  await flush();
  assert.equal(backend.snapshot().pending, 0);
  assert.equal(backend.snapshot().entries, 0);
});

test("cache validates existing image ownership/domain and true owned bytes, not claimed format metadata", async () => {
  const backend = new CacheBackend(2, 1000, 2);
  for (const value of [
    { metadata: { kind: "png", width: 1, height: 1 } },
    createOwnedResource({ kind: "font", width: 1, height: 1 }),
    createOwnedResource({ kind: "png", width: Infinity, height: 1 }),
  ]) {
    const claim = backend.acquire(policy, "a", 100, undefined, async () => ({
      resource: value as never,
      sourceBytes: 1,
    }));
    await assert.rejects(claim.result);
    assert.equal(backend.snapshot().entries, 0);
  }
  const resource = createOwnedResource({ kind: "png", width: 1, height: 1 }, { byteLength: 999 });
  const claim = backend.acquire(policy, "a", 100, undefined, async () => ({ resource, sourceBytes: 1 }));
  await claim.result;
  assert.equal(backend.snapshot().entries, 0);
});

test("same resource under distinct keys is conservatively charged per entry and no policy history remains", async () => {
  const backend = new CacheBackend(2, 10000, 2);
  const resource = await preparePng(fixture());
  for (const uri of ["a", "b"]) {
    const claim = backend.acquire(policy, uri, 100, undefined, async () => ({ resource, sourceBytes: 80 }));
    await claim.result;
  }
  assert.equal(backend.snapshot().accountedBytes, 2 * (ownedResourceBytes(resource) + 2));
  backend.clear();
  assert.equal(backend.snapshot().accountedBytes, 0);
});

test("each joined operation pays logical source bytes once, while completed hits pay no transport", async () => {
  const c = controlled();
  const first = assert.rejects(render(c.config, ["logo", "other"], undefined, 130));
  const second = assert.rejects(render(c.config, ["logo", "other"], undefined, 130));
  await flush();
  c.complete(0);
  for (let attempt = 0; attempt < 100 && c.jobs.length < 2; attempt++)
    await new Promise((resolve) => setTimeout(resolve, 1));
  assert.equal(c.jobs.length, 2);
  c.complete(1);
  await Promise.all([first, second]);
  assert.equal(c.jobs.length, 2);
  const warm = render(c.config, ["logo"], undefined, 130);
  await warm;
  assert.equal(c.jobs.length, 2);
});

test("a pending reservation can prevent retention without failing an otherwise valid render", async () => {
  const c = controlled({ maxBytes: 120 });
  const old = render(c.config, ["x".repeat(55)]);
  await flush();
  const next = render(c.config);
  await flush();
  c.complete(1);
  await next;
  assert.equal(c.config.cache.snapshot().entries, 0);
  assert.equal(c.config.cache.snapshot().pending, 1);
  c.complete(0);
  await old;
  assert.equal(c.config.cache.snapshot().pending, 0);
});

test("newer uncached oversize result doesn't replace older retained same-policy result", async () => {
  const c = controlled({ maxBytes: 200 });
  const old = resource(c.config);
  const next = render(c.config, undefined, undefined, 1000);
  await flush();
  c.complete(0);
  const retained = await old;
  // A larger but valid PNG source/resource, same signature and dimensions.
  c.jobs[1]!.resolve(new Uint8Array(fixture(6, undefined, [chunk("tEXt", new Uint8Array(200))])));
  await next;
  assert.equal(await resource(c.config), retained);
});
