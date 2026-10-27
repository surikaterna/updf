import assert from "node:assert/strict";
import test from "node:test";
import { createAssetLoader } from "@updf/images/load";
import { pngImages } from "@updf/images/png";
import { cache, code, controlled, deferred, flush, render, resource } from "./cache-helpers.js";

test("two real renders join one independent job; aborting first doesn't poison the other", async () => {
  const c = controlled();
  const a = new AbortController();
  const first = render(c.config, undefined, a);
  const firstRejected = assert.rejects(first);
  const second = render(c.config);
  await flush();
  assert.equal(c.jobs.length, 1);
  assert.equal(c.config.cache.snapshot().consumers, 2);
  assert.notEqual(c.signals[0], a.signal);
  a.abort();
  await firstRejected;
  assert.equal(c.config.cache.snapshot().consumers, 1);
  c.complete(0);
  assert.ok((await second).length > 100);
  assert.equal(c.config.cache.snapshot().entries, 1);
  assert.equal(c.resolutions(), 2);
});

test("all cancelled ignored-abort jobs keep pending slots and key bytes until genuine settlement", async () => {
  for (const lateFailure of [false, true]) {
    const c = controlled({ maxEntries: 1 });
    const a = new AbortController();
    const b = new AbortController();
    const first = assert.rejects(render(c.config, undefined, a));
    const second = assert.rejects(render(c.config, undefined, b));
    await flush();
    a.abort();
    b.abort();
    await Promise.all([first, second]);
    assert.deepEqual(c.config.cache.snapshot(), {
      entries: 0,
      pending: 1,
      consumers: 0,
      accountedBytes: 8,
      disposed: false,
    });
    assert.equal((c.signals[0] as AbortSignal).aborted, true);
    await assert.rejects(render(c.config), code("LIMIT"));
    assert.equal(c.jobs.length, 1);
    if (lateFailure) c.jobs[0]!.reject(new Error("late"));
    else c.complete(0);
    await flush();
    assert.equal(c.config.cache.snapshot().pending, 0);
    assert.equal(c.config.cache.snapshot().accountedBytes, 0);
    assert.equal(c.config.cache.snapshot().entries, 0);
  }
});

test("consumer saturation rejects before extra work, abort release allows joining remaining subscriber", async () => {
  const c = controlled({ maxConsumers: 2 });
  const a = new AbortController();
  const first = assert.rejects(render(c.config, undefined, a));
  const second = render(c.config);
  await flush();
  await assert.rejects(render(c.config), code("LIMIT"));
  a.abort();
  await first;
  const third = render(c.config);
  await flush();
  assert.equal(c.config.cache.snapshot().consumers, 2);
  assert.equal(c.jobs.length, 1);
  c.complete(0);
  assert.deepEqual(await second, await third);
});

test("clear invalidates joining and retention, not existing consumers or unsettled capacity", async () => {
  const c = controlled({ maxEntries: 1 });
  const first = render(c.config);
  await flush();
  c.config.cache.clear();
  await assert.rejects(render(c.config), code("LIMIT"));
  assert.equal(c.jobs.length, 1);
  c.complete(0);
  await first;
  assert.equal(c.config.cache.snapshot().entries, 0);
  const second = render(c.config);
  await flush();
  c.complete(1);
  await second;
  assert.equal(c.config.cache.snapshot().entries, 1);
});

test("clear's old results cannot overwrite current generation; dispose cancels all and remains truthful", async () => {
  const c = controlled();
  const first = resource(c.config);
  await flush();
  c.config.cache.clear();
  const second = resource(c.config);
  await flush();
  c.complete(1);
  const newer = await second;
  c.complete(0);
  assert.notEqual(await first, newer);
  assert.equal(await resource(c.config), newer);
  const pending = assert.rejects(render(c.config, ["other"]));
  await flush();
  c.config.cache.dispose();
  c.config.cache.dispose();
  c.config.cache.clear();
  await pending;
  assert.deepEqual(c.config.cache.snapshot(), {
    entries: 0,
    pending: 1,
    consumers: 0,
    accountedBytes: 10,
    disposed: true,
  });
  await assert.rejects(render(c.config), code("PHASE"));
  c.complete(2);
  await flush();
  assert.deepEqual(c.config.cache.snapshot(), {
    entries: 0,
    pending: 0,
    consumers: 0,
    accountedBytes: 0,
    disposed: true,
  });
});

test("different exact transport bounds don't coalesce; newest retained result wins reversed completion", async () => {
  const c = controlled();
  const old = resource(c.config);
  const newer = render(c.config, undefined, undefined, 1000);
  await flush();
  assert.equal(c.jobs.length, 2);
  c.complete(1);
  await newer;
  const winner = await resource(c.config);
  c.complete(0);
  assert.notEqual(await old, winner);
  assert.equal(await resource(c.config), winner);
  assert.equal(c.jobs.length, 2);
});

test("failed newer job doesn't poison an older valid completion", async () => {
  const c = controlled();
  const old = resource(c.config);
  const newer = assert.rejects(render(c.config, undefined, undefined, 1000));
  await flush();
  c.jobs[1]!.reject(new Error("expected"));
  await newer;
  c.complete(0);
  const winner = await old;
  assert.equal(await resource(c.config), winner);
});

test("all failed operation admissions retain a successfully prepared source for a later larger budget", async () => {
  const c = controlled();
  const first = assert.rejects(render(c.config, undefined, undefined, 80));
  const second = assert.rejects(render(c.config, undefined, undefined, 80));
  await flush();
  c.complete(0);
  await Promise.all([first, second]);
  assert.equal(c.jobs.length, 1);
  assert.equal(c.config.cache.snapshot().entries, 1);
  assert.ok((await render(c.config)).length > 100);
  assert.equal(c.jobs.length, 1);
});

test("last shared abort reaches the real AssetLoader and cancels/releases its streaming reader", async () => {
  const started = deferred<void>();
  const read = deferred<{ done: true }>();
  let cancelled = 0,
    released = 0,
    fetches = 0;
  const loader = createAssetLoader({
    baseURI: "https://fixture.invalid/",
    fetch: async () => {
      fetches++;
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        body: {
          getReader: () => ({
            read() {
              started.resolve();
              return read.promise;
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
  const config = { loader, formatHandlers: [pngImages()], cache: cache() };
  const a = new AbortController(),
    b = new AbortController();
  const first = assert.rejects(render(config, undefined, a));
  const second = assert.rejects(render(config, undefined, b));
  await started.promise;
  a.abort();
  b.abort();
  await Promise.all([first, second]);
  read.resolve({ done: true });
  await flush();
  assert.equal(fetches, 1);
  assert.equal(cancelled, 1);
  assert.equal(released, 1);
  assert.equal(config.cache.snapshot().entries, 0);
  assert.equal(config.cache.snapshot().pending, 0);
});
