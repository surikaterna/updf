import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { cacheRoot, readCached } from "./cache.js";
import { type Comparison, passed } from "./compare.js";
import { corpus, revision, sourceRevisions } from "./manifest.js";
import { options, selected } from "./options.js";
import type { CorpusFont } from "./types.js";

async function evaluate(item: CorpusFont, root: string, oracle?: string) {
  try {
    await readCached(root, item.license);
    await readCached(root, item.font);
  } catch (error) {
    return { status: "cache-error", message: String(error) };
  }
  try {
    const worker = fileURLToPath(new URL("./worker.ts", import.meta.url));
    const output = execFileSync(
      process.execPath,
      ["--max-old-space-size=256", "--import", "tsx", worker, item.id, root, ...(oracle ? [oracle] : [])],
      { encoding: "utf8", timeout: 15000, maxBuffer: 1024 * 1024, stdio: "pipe" },
    );
    return JSON.parse(output) as Comparison;
  } catch (error) {
    return { status: "worker-error", message: String(error).slice(0, 4000) };
  }
}

const config = options(process.argv.slice(2), "test"),
  fonts = selected(corpus, config.suite, config.id);
const root = cacheRoot(),
  results = [];
for (const item of fonts) {
  const result = await evaluate(item, root, config.oracle);
  results.push({
    id: item.id,
    sha256: item.font.sha256,
    licenseSha256: item.license.sha256,
    expected: item.expected,
    tags: item.tags,
    ...result,
  });
  console.log(`${result.status}: ${item.id}`);
}
const failures = results.filter((result) => !passed(result.status)).length;
const parityDifferences = results.filter((result) => "parity" in result && result.parity === "different").length;
await mkdir(dirname(config.output), { recursive: true });
await writeFile(
  config.output,
  `${JSON.stringify(
    {
      version: 2,
      node: process.version,
      revision,
      sourceRevisions,
      manifestSha256: createHash("sha256").update(JSON.stringify(corpus)).digest("hex"),
      suite: config.suite,
      selected: results.length,
      failures,
      parityDifferences,
      boundsOracleRequested: !!config.oracle,
      results,
    },
    null,
    2,
  )}\n`,
);
console.log(
  `${results.length - failures}/${results.length} checks passed; ${failures} failures; ${parityDifferences} Fontkit parity differences; report: ${config.output}`,
);
if (failures) process.exitCode = 1;
