import { cacheRoot, ensureCached } from "./cache.js";
import { corpus } from "./manifest.js";
import { options, selected } from "./options.js";
import type { Asset } from "./types.js";

const config = options(process.argv.slice(2), "fetch");
const fonts = selected(corpus, config.suite, config.id),
  root = cacheRoot();
const assets = new Map<string, Asset>();
for (const font of fonts) for (const asset of [font.license, font.font]) assets.set(asset.sha256, asset);
const queue = [...assets.values()];
let next = 0;
async function consume(): Promise<void> {
  while (next < queue.length) {
    const asset = queue[next++]!;
    const status = await ensureCached(root, asset);
    console.log(`${status} ${asset.sha256} ${asset.size} ${asset.url}`);
  }
}
const results = await Promise.allSettled(Array.from({ length: 3 }, () => consume()));
for (const result of results) {
  if (result.status === "rejected") {
    console.error(result.reason);
    process.exitCode = 1;
  }
}
console.log(`${fonts.length} selected fonts; ${assets.size} distinct font/license assets; cache: ${root}`);
