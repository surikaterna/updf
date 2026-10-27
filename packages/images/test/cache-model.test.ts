import assert from "node:assert/strict";
import test from "node:test";
import { preparePng } from "@updf/png";
import { CacheBackend } from "../src/cache-backend.js";
import { deferred, flush } from "./cache-helpers.js";
import { fixture } from "../../png/test/helpers.js";
import type { ImageClaim, ImagePolicy } from "../src/cache-owner.js";
import type { PreparedJobResult } from "../src/prepared-job.js";

test("seeded bounded job/consumer/clear/settle sequences keep all snapshot domains and release final work", async () => {
  const backend = new CacheBackend(4, 500, 3);
  const value = { resource: await preparePng(fixture()), sourceBytes: 78 };
  const policy: ImagePolicy = { receiver: {}, load: () => {}, resolve: () => {}, handlers: [{}] };
  const jobs: ReturnType<typeof deferred<Readonly<PreparedJobResult>>>[] = [];
  const claims: ImageClaim[] = [];
  let seed = 923;
  for (let i = 0; i < 200; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const action = seed % 5;
    if (action === 0) backend.clear();
    else if (action === 1) claims.shift()?.release();
    else if (action === 2) jobs.shift()?.resolve(value);
    else {
      try {
        const claim = backend.acquire(policy, `key${seed % 3}`, 80 + (seed % 2), undefined, () => {
          const pending = deferred<Readonly<PreparedJobResult>>();
          jobs.push(pending);
          return pending.promise;
        });
        claims.push(claim);
        void claim.result.catch(() => {});
      } catch {
        /* Capacity rejection is an expected action in this bounded model. */
      }
    }
    await flush();
    const state = backend.snapshot();
    assert.ok(state.entries + state.pending <= 4);
    assert.ok(state.consumers <= 3);
    assert.ok(state.accountedBytes <= 500);
    for (const field of [state.entries, state.pending, state.consumers, state.accountedBytes])
      assert.ok(Number.isSafeInteger(field) && field >= 0);
  }
  backend.dispose();
  for (const pending of jobs) pending.resolve(value);
  await flush();
  assert.deepEqual(backend.snapshot(), { entries: 0, pending: 0, consumers: 0, accountedBytes: 0, disposed: true });
});

test("start order exhaustion is an exact LIMIT before work or eviction", () => {
  const backend = new CacheBackend(1, 500, 1);
  Reflect.set(backend, "order", Number.MAX_SAFE_INTEGER);
  const policy: ImagePolicy = { receiver: {}, load: () => {}, resolve: () => {}, handlers: [] };
  let calls = 0;
  assert.throws(() =>
    backend.acquire(policy, "a", 80, undefined, async () => {
      calls++;
      throw Error("unreachable");
    }),
  );
  assert.equal(calls, 0);
  assert.equal(backend.snapshot().pending, 0);
});

test("an older pending job stays superseded after its newer retained result is capacity-evicted", async () => {
  const backend = new CacheBackend(2, 1000, 3);
  const policy: ImagePolicy = { receiver: {}, load: () => {}, resolve: () => {}, handlers: [] };
  const value = { resource: await preparePng(fixture()), sourceBytes: 78 };
  const pending = deferred<Readonly<PreparedJobResult>>();
  const old = backend.acquire(policy, "a", 80, undefined, () => pending.promise);
  const newer = backend.acquire(policy, "a", 90, undefined, async () => value);
  await newer.result;
  const other = backend.acquire(policy, "b", 80, undefined, async () => value);
  await other.result;
  assert.equal(backend.peek(policy, "a"), undefined);
  pending.resolve(value);
  await old.result;
  assert.equal(backend.peek(policy, "a"), undefined);
  assert.equal(backend.snapshot().entries, 1);
});
