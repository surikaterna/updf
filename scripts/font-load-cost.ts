import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { measureFontLoad } from "./consumer/font-load-cost.js";

const current = await measureFontLoad();
const baseline = process.argv[2] ? await measureFontLoad(resolve(process.argv[2]), true) : undefined;
await mkdir(new URL("../artifacts/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../artifacts/font-load-cost.json", import.meta.url),
  JSON.stringify({ current, baseline }, null, 2),
);
console.table(
  current.map(({ profile, raw, gzip }) => ({
    profile,
    raw,
    gzip,
    baselineGzip: baseline?.find((row) => row.profile === profile)?.gzip,
  })),
);
