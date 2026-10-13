import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import test, { type TestContext } from "node:test";
import { ensureCached, readCached } from "../../scripts/font-corpus/cache.js";

const bytes = new Uint8Array([1, 2, 3]);
const asset = {
  url: `https://raw.githubusercontent.com/example/fonts/${"a".repeat(40)}/font.ttf`,
  size: bytes.length,
  sha256: createHash("sha256").update(bytes).digest("hex"),
};
async function directory(t: TestContext): Promise<string> {
  const root = await mkdtemp("/tmp/opencode/font-corpus-deadline-");
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
async function bounded<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const guard = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error("Test guard: operation did not settle")), 1500);
  });
  try {
    return await Promise.race([work, guard]);
  } finally {
    clearTimeout(timer);
  }
}

test("corpus deadline does not rely on body abort cooperation or await a stuck cancel", async (t) => {
  const root = await directory(t);
  let cancelCalled = false,
    control: ReadableStreamDefaultController<Uint8Array> | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      control = controller;
      controller.enqueue(bytes);
    },
    cancel() {
      cancelCalled = true;
      return new Promise<void>(() => {});
    },
  });
  try {
    await assert.rejects(
      bounded(ensureCached(root, asset, async () => new Response(stream), 20)),
      /aborted|timeout|deadline/iu,
    );
    assert.equal(cancelCalled, true);
    assert.equal(stream.locked, false);
    await assert.rejects(readCached(root, asset), { code: "ENOENT" });
    assert.equal(await ensureCached(root, asset, async () => new Response(bytes)), "downloaded");
    assert.deepEqual(await readCached(root, asset), bytes);
  } finally {
    control?.error(new Error("test cleanup"));
  }
});

test("oversized body rejection is not held hostage by cancellation cleanup", async (t) => {
  const root = await directory(t);
  let cancelCalled = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2, 3, 4]));
    },
    cancel() {
      cancelCalled = true;
      return new Promise<void>(() => {});
    },
  });
  await assert.rejects(bounded(ensureCached(root, asset, async () => new Response(stream), 20)), /exceeds|limit/iu);
  assert.equal(cancelCalled, true);
  assert.equal(stream.locked, false);
  await assert.rejects(readCached(root, asset), { code: "ENOENT" });
});

test("corpus deadline settles even if the fetch promise itself ignores abort", async (t) => {
  const root = await directory(t);
  await assert.rejects(
    bounded(ensureCached(root, asset, async () => new Promise<Response>(() => {}), 20)),
    /aborted|timeout|deadline/iu,
  );
  await assert.rejects(readCached(root, asset), { code: "ENOENT" });
});
