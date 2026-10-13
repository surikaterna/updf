import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cacheRoot } from "../font-corpus/cache.js";
import { campaign, type CampaignResult } from "./campaign.js";
import { hash } from "./check.js";
import { context, mutate, mutationVersion } from "./mutations.js";
import { options } from "./options.js";
import { loadSeed, seeds } from "./sources.js";

const config = options(process.argv.slice(2)),
  selected = seeds(config.suite, config.id),
  cache = cacheRoot();
assert.ok(selected.length * config.cases <= 25000, "Campaign exceeds 25,000 case budget");
await mkdir(config.output, { recursive: true });
async function saveFinding(result: CampaignResult): Promise<void> {
  const finding = result.finding!;
  const name = `${result.source.id}-${result.source.sha256.slice(0, 12)}-v${mutationVersion}-${config.seed}-${finding.index ?? "seed"}`;
  let artifact: { sha256: string; file: string } | undefined;
  if (finding.index !== null) {
    const base = await loadSeed(result.source, cache);
    const { bytes } = mutate(base, context(base), config.seed, finding.index);
    const sha256 = hash(bytes);
    if (finding.bytesSha256) assert.equal(sha256, finding.bytesSha256, "Replay recipe differs from worker input");
    artifact = { sha256, file: `${name}.bin` };
    await writeFile(join(config.output, artifact.file), bytes);
  }
  await writeFile(
    join(config.output, `${name}.json`),
    `${JSON.stringify(
      {
        mutationVersion,
        source: result.source,
        seed: config.seed,
        start: config.start,
        timeoutMs: config.timeoutMs,
        finding,
        artifact,
        replay:
          finding.index === null
            ? null
            : `npm run fuzz:fontkite -- --suite all --id ${result.source.id} --seed ${config.seed} --case ${finding.index} --timeout-ms ${config.timeoutMs} --mutation-version ${mutationVersion} --expected-sha256 ${artifact!.sha256}`,
        sequenceReplay: `npm run fuzz:fontkite -- --suite all --id ${result.source.id} --seed ${config.seed} --case ${config.start} --cases ${finding.index === null ? config.cases : finding.index - config.start + 1} --timeout-ms ${config.timeoutMs} --mutation-version ${mutationVersion}`,
      },
      null,
      2,
    )}\n`,
  );
}
const results: CampaignResult[] = [];
for (const source of selected) {
  const result = await campaign(source, cache, config);
  results.push(result);
  if (result.finding) await saveFinding(result);
  console.log(
    `${source.id}: ${result.completed}/${result.planned}, accepted=${result.accepted}, rejected=${result.rejected}${result.finding ? ` FINDING: ${result.finding.message}` : ""}`,
  );
  if (results.filter((item) => item.finding).length >= 10) break;
}
const findings = results.filter((result) => result.finding).length;
const summary = {
  mutationVersion,
  node: process.version,
  config,
  selectedSources: selected.length,
  plannedCases: selected.length * config.cases,
  completedCases: results.reduce((sum, result) => sum + result.completed, 0),
  accepted: results.reduce((sum, result) => sum + result.accepted, 0),
  rejected: results.reduce((sum, result) => sum + result.rejected, 0),
  findings,
  results,
};
await writeFile(join(config.output, "report.json"), `${JSON.stringify(summary, null, 2)}\n`);
console.log({ completed: summary.completedCases, planned: summary.plannedCases, findings });
if (findings || summary.completedCases !== summary.plannedCases) process.exitCode = 1;
