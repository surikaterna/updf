import { readCached } from "./cache.js";
import { compare } from "./compare.js";
import { corpus } from "./manifest.js";
import { loadOracle } from "./bounds-oracle.js";

const [id, root, oraclePath] = process.argv.slice(2);
const item = corpus.find((font) => font.id === id);
if (!item || !root) throw new Error("Expected corpus ID and cache root");
await readCached(root, item.license);
const bytes = await readCached(root, item.font);
const oracle = oraclePath && item.expected.kind === "supported" ? await loadOracle(oraclePath, item) : undefined;
process.stdout.write(
  JSON.stringify({
    ...compare(bytes, item.expected, oracle?.font),
    ...(oracle ? { oracleSha256: oracle.sha256 } : {}),
  }),
);
