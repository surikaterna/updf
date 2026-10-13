import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test, { type TestContext } from "node:test";
import { cachePath, cacheRoot, ensureCached, readCached } from "../../scripts/font-corpus/cache.js";
import { type Asset, validateAsset } from "../../scripts/font-corpus/types.js";

const bytes = new Uint8Array([1, 2, 3]);
const asset: Asset = {
  url: `https://raw.githubusercontent.com/example/fonts/${"a".repeat(40)}/font.ttf`,
  size: bytes.length,
  sha256: createHash("sha256").update(bytes).digest("hex"),
};
async function directory(t: TestContext): Promise<string> {
  const root = await mkdtemp("/tmp/opencode/font-corpus-cache-test-");
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test("corpus cache validates pinned identities and respects shared-cache overrides", () => {
  validateAsset(asset);
  for (const invalid of [
    { sha256: "../escape" },
    { size: 0 },
    { size: Infinity },
    { size: 4 * 1024 * 1024 + 1 },
    { url: asset.url.replace("https:", "http:") },
    { url: asset.url.replace("a".repeat(40), "main") },
    { url: `${asset.url}?latest=true` },
    { url: "https://example.com/font.ttf" },
  ]) {
    assert.throws(() => validateAsset({ ...asset, ...invalid }));
  }
  assert.equal(cacheRoot({ UPDF_FONT_CORPUS_CACHE: "/custom" }), "/custom");
  assert.equal(cacheRoot({ XDG_CACHE_HOME: "/cache" }), "/cache/updf/font-corpus");
});

test("cache cold/warm reads verify hashes, and corrupt entries never trigger silent replacement", async (t) => {
  const root = await directory(t);
  let requests = 0;
  const fetcher: typeof fetch = async (_url, options) => {
    requests++;
    assert.equal(options?.redirect, "error");
    assert.ok(options?.signal);
    return new Response(bytes);
  };
  assert.equal(await ensureCached(root, asset, fetcher), "downloaded");
  assert.deepEqual(await readCached(root, asset), bytes);
  assert.equal(await ensureCached(root, asset, fetcher), "cached");
  assert.equal(requests, 1);
  await writeFile(cachePath(root, asset), new Uint8Array([4, 5, 6]));
  await assert.rejects(ensureCached(root, asset, fetcher), /integrity mismatch/u);
  assert.equal(requests, 1);
  await writeFile(cachePath(root, asset), new Uint8Array([1]));
  await assert.rejects(readCached(root, asset), /size\/type/u);
});

test("bad hash, truncation, oversized streams and HTTP errors never enter the cache", async (t) => {
  const root = await directory(t);
  for (const response of [
    new Response(new Uint8Array([9, 9, 9])),
    new Response(new Uint8Array([1])),
    new Response(new Uint8Array([1, 2, 3, 4])),
    new Response("error", { status: 500 }),
  ]) {
    await assert.rejects(
      ensureCached(root, asset, async () => response),
      /mismatch|exceeds|HTTP/u,
    );
    await assert.rejects(readCached(root, asset), { code: "ENOENT" });
  }
});

test("simultaneous worktree fetches publish only complete verified objects", async (t) => {
  const root = await directory(t);
  const fetcher: typeof fetch = async () => new Response(bytes);
  await Promise.all(Array.from({ length: 6 }, () => ensureCached(root, asset, fetcher)));
  assert.deepEqual(await readCached(root, asset), bytes);
  assert.deepEqual(await readdir(join(root, "sha256")), [asset.sha256]);
});

test("deadline aborts stalled headers and stalled bodies, not just the initial request", async (t) => {
  const root = await directory(t);
  const headers: typeof fetch = async (_url, options) =>
    new Promise((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(new Error("aborted headers")), { once: true });
    });
  await assert.rejects(ensureCached(root, asset, headers, 20), /aborted headers/u);
  const body: typeof fetch = async (_url, options) =>
    new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1]));
          options?.signal?.addEventListener("abort", () => controller.error(new Error("aborted body")), { once: true });
        },
      }),
    );
  await assert.rejects(ensureCached(root, asset, body, 20), /aborted body/u);
  await assert.rejects(readCached(root, asset), { code: "ENOENT" });
});
