import assert from "node:assert/strict";
import { resolve } from "node:path";
import { mutationVersion } from "./mutations.js";

const flags = [
  "--suite",
  "--id",
  "--cases",
  "--seed",
  "--case",
  "--timeout-ms",
  "--output",
  "--expected-sha256",
  "--mutation-version",
];

export function options(args: readonly string[]) {
  const values = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]!,
      value = args[i + 1];
    assert.ok(flags.includes(key), `Unknown option ${key}`);
    assert.ok(value && !value.startsWith("--") && !values.has(key), `Missing/duplicate option ${key}`);
    values.set(key, value);
  }
  const integer = (key: string, fallback: number, min: number, max: number) => {
    const text = values.get(key);
    if (text !== undefined) assert.match(text, /^(?:0x[\da-f]+|\d+)$/iu);
    const value = text === undefined ? fallback : Number(text);
    assert.ok(Number.isSafeInteger(value) && value >= min && value <= max, `Invalid ${key}`);
    return value;
  };
  const start = integer("--case", 0, 0, 24999);
  const cases = integer("--cases", values.has("--case") ? 1 : 128, 1, 2000);
  assert.ok(start + cases <= 25000, "Case range exceeds budget");
  assert.equal(
    integer("--mutation-version", mutationVersion, 1, 1000),
    mutationVersion,
    "Mutation recipe version changed",
  );
  const expectedSha256 = values.get("--expected-sha256");
  if (expectedSha256) {
    assert.match(expectedSha256, /^[a-f0-9]{64}$/u);
    assert.ok(cases === 1 && values.has("--id"), "Checksum replay requires one case and a source ID");
  }
  return {
    suite: values.get("--suite") ?? "fixtures",
    id: values.get("--id"),
    seed: integer("--seed", 0xf017c17e, 0, 0xffffffff),
    cases,
    start,
    timeoutMs: integer("--timeout-ms", 2000, 100, 10000),
    output: resolve(values.get("--output") ?? "artifacts/font-fuzz"),
    ...(expectedSha256 ? { expectedSha256 } : {}),
  };
}
