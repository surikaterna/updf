import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { createAssetLoader } from "@updf/assets";
import { type Asset, validateAsset } from "./types.js";

export function cacheRoot(env: NodeJS.ProcessEnv = process.env): string {
  return env.UPDF_FONT_CORPUS_CACHE ?? join(env.XDG_CACHE_HOME ?? join(homedir(), ".cache"), "updf", "font-corpus");
}
export function cachePath(root: string, asset: Asset): string {
  validateAsset(asset);
  return join(root, "sha256", asset.sha256);
}
export function verify(bytes: Uint8Array, asset: Asset): void {
  if (bytes.length !== asset.size || createHash("sha256").update(bytes).digest("hex") !== asset.sha256)
    throw new Error(`Corpus integrity mismatch: ${asset.url}`);
}
export async function readCached(root: string, asset: Asset): Promise<Uint8Array<ArrayBuffer>> {
  const handle = await open(cachePath(root, asset), "r");
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size !== asset.size) throw new Error(`Invalid cached size/type: ${asset.sha256}`);
    const bytes = new Uint8Array(asset.size + 1);
    let length = 0;
    while (length < bytes.length) {
      const { bytesRead } = await handle.read(bytes, length, bytes.length - length, null);
      if (!bytesRead) break;
      length += bytesRead;
    }
    const result = bytes.slice(0, length);
    verify(result, asset);
    return result;
  } finally {
    await handle.close();
  }
}

async function download(asset: Asset, fetcher: typeof fetch, timeoutMs: number): Promise<Uint8Array<ArrayBuffer>> {
  // Shared transport races headers/body reads against abort and never awaits stalled cancellation.
  const loader = createAssetLoader({ fetch: fetcher, maxBytes: asset.size, timeoutMs });
  const bytes = await loader.load(asset.url);
  verify(bytes, asset);
  return bytes;
}

/** Identical concurrent downloads are harmless: only verified bytes are atomically published. */
export async function ensureCached(
  root: string,
  asset: Asset,
  fetcher: typeof fetch = fetch,
  timeoutMs = 30000,
): Promise<"cached" | "downloaded"> {
  const target = cachePath(root, asset);
  try {
    await readCached(root, asset);
    return "cached";
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  const bytes = await download(asset, fetcher, timeoutMs);
  await mkdir(join(root, "sha256"), { recursive: true });
  const temporary = `${target}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, bytes, { flag: "wx" });
    await rename(temporary, target);
  } finally {
    await rm(temporary, { force: true });
  }
  return "downloaded";
}
