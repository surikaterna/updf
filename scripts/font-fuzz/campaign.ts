import assert from "node:assert/strict";
import type { Outcome } from "./check.js";
import { Session } from "./session.js";
import { strategies } from "./mutations.js";
import type { SeedFont } from "./sources.js";

export interface CaseResult extends Outcome {
  readonly index: number;
  readonly kind: string;
  readonly bytesSha256: string;
  readonly durationMs: number;
}
export interface CampaignOptions {
  readonly seed: number;
  readonly cases: number;
  readonly start: number;
  readonly timeoutMs: number;
  readonly expectedSha256?: string;
}
export interface CampaignResult {
  readonly source: SeedFont;
  readonly planned: number;
  readonly completed: number;
  readonly accepted: number;
  readonly rejected: number;
  readonly codes: Readonly<Record<string, number>>;
  readonly strategies: Readonly<Record<string, number>>;
  readonly maxCaseMs: number;
  readonly finding?: { readonly index: number | null; readonly message: string; readonly bytesSha256?: string };
}
function ready(value: unknown, source: SeedFont): void {
  assert.ok(value && typeof value === "object" && "type" in value);
  if (value.type === "seed-error")
    throw new Error(`Seed validation failed: ${"message" in value ? value.message : "unknown"}`);
  assert.ok(
    value.type === "ready" && "sourceSha256" in value && value.sourceSha256 === source.sha256,
    "Bad worker initialization",
  );
}
function result(value: unknown, index: number, source: SeedFont): CaseResult {
  assert.ok(value && typeof value === "object" && "type" in value && value.type === "result");
  const row = value as Record<string, unknown>;
  const kind = strategies[index % strategies.length]!;
  assert.equal(row.index, index, "Wrong case receipt");
  assert.equal(row.kind, kind);
  assert.ok(typeof row.bytesSha256 === "string");
  assert.match(row.bytesSha256, /^[a-f0-9]{64}$/u);
  if (kind === "control") assert.equal(row.bytesSha256, source.sha256, "Control receipt changed seed bytes");
  assert.ok(typeof row.durationMs === "number" && Number.isFinite(row.durationMs) && row.durationMs >= 0);
  const status = row.status;
  assert.ok(status === "accepted" || status === "rejected" || status === "finding");
  assert.ok(row.code === undefined || (typeof row.code === "string" && /^[A-Z][A-Z0-9_]*$/u.test(row.code)));
  assert.ok(row.message === undefined || (typeof row.message === "string" && row.message.length <= 8192));
  if (status === "rejected") assert.ok(typeof row.code === "string", "Rejected receipt lacks diagnostic");
  if (status === "finding")
    assert.ok(typeof row.message === "string" && row.message.length > 0, "Finding receipt lacks message");
  return {
    index,
    kind,
    bytesSha256: row.bytesSha256,
    durationMs: row.durationMs,
    status,
    ...(row.code === undefined ? {} : { code: row.code }),
    ...(row.message === undefined ? {} : { message: row.message }),
  };
}
function validate(options: CampaignOptions): void {
  assert.ok(Number.isInteger(options.seed) && options.seed >= 0 && options.seed <= 0xffffffff);
  assert.ok(Number.isInteger(options.cases) && options.cases > 0 && options.cases <= 2000);
  assert.ok(Number.isInteger(options.start) && options.start >= 0 && options.start + options.cases <= 25000);
  assert.ok(Number.isInteger(options.timeoutMs) && options.timeoutMs >= 100 && options.timeoutMs <= 10000);
  if (options.expectedSha256 !== undefined) {
    assert.equal(options.cases, 1);
    assert.match(options.expectedSha256, /^[a-f0-9]{64}$/u);
  }
}
export async function campaign(
  source: SeedFont,
  cache: string,
  options: CampaignOptions,
  worker?: URL,
): Promise<CampaignResult> {
  validate(options);
  const session = new Session(source.id, cache, worker);
  const stats = {
    source,
    planned: options.cases,
    completed: 0,
    accepted: 0,
    rejected: 0,
    codes: Object.create(null) as Record<string, number>,
    strategies: Object.create(null) as Record<string, number>,
    maxCaseMs: 0,
  };
  let index: number | null = null;
  try {
    ready(await session.receive(15000), source);
    for (index = options.start; index < options.start + options.cases; index++) {
      const row = result(
        await session.receive(options.timeoutMs, {
          seed: options.seed,
          index,
          ...(options.expectedSha256 ? { expectedSha256: options.expectedSha256 } : {}),
        }),
        index,
        source,
      );
      stats.completed++;
      stats.maxCaseMs = Math.max(stats.maxCaseMs, row.durationMs);
      stats.strategies[row.kind] = (stats.strategies[row.kind] ?? 0) + 1;
      if (row.status === "finding")
        return {
          ...stats,
          finding: { index, message: row.message ?? "Unspecified finding", bytesSha256: row.bytesSha256 },
        };
      stats[row.status]++;
      if (row.code) stats.codes[row.code] = (stats.codes[row.code] ?? 0) + 1;
    }
    return stats;
  } catch (error) {
    return { ...stats, finding: { index, message: String(error).slice(0, 8192) } };
  } finally {
    await session.stop();
  }
}
