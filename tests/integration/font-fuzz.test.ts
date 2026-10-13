import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { prepareFont } from "@updf/fontkite";
import { campaign } from "../../scripts/font-fuzz/campaign.js";
import { check, hash } from "../../scripts/font-fuzz/check.js";
import { context, mutate, strategies } from "../../scripts/font-fuzz/mutations.js";
import { options } from "../../scripts/font-fuzz/options.js";
import { loadSeed, seeds } from "../../scripts/font-fuzz/sources.js";

const source = seeds("fixtures")[0]!;

test("mutation recipes cover all strategies, preserve seeds and reproduce exact bytes", async () => {
  const bytes = await loadSeed(source, "/unused"),
    data = context(bytes),
    original = hash(bytes);
  const kinds = new Set<string>();
  for (let index = 0; index < 48; index++) {
    const first = mutate(bytes, data, 12345, index),
      second = mutate(bytes, data, 12345, index);
    assert.deepEqual(first, second);
    assert.ok(first.bytes.length <= bytes.length + 256);
    assert.equal(hash(bytes), original);
    kinds.add(first.kind);
    if (first.kind === "control") assert.deepEqual(first.bytes, bytes);
  }
  assert.deepEqual([...kinds], [...strategies]);
  assert.notEqual(hash(mutate(bytes, data, 12345, 0).bytes), hash(mutate(bytes, data, 12346, 0).bytes));
});

test("checker distinguishes structured rejection from raw exceptions and enforces input ownership", async () => {
  const bytes = await loadSeed(source, "/unused"),
    other = await loadSeed(seeds("fixtures")[1]!, "/unused");
  const baseline = hash(JSON.stringify(prepareFont(bytes).metadata));
  assert.equal(check(bytes, baseline).status, "accepted");
  assert.equal(check(new Uint8Array([1])).status, "rejected");
  assert.equal(check(new Uint8Array([1]), baseline).status, "finding");
  assert.match(
    check(bytes, undefined, () => {
      throw new RangeError("raw parser failure");
    }).message!,
    /Unstructured/u,
  );
  const mutation = check(bytes.slice(), undefined, (input) => {
    const font = prepareFont(input);
    input[0] = input[0]! ^ 1;
    return font;
  });
  assert.match(mutation.message!, /input was mutated/u);
  let calls = 0;
  assert.match(check(bytes, undefined, () => prepareFont(++calls === 1 ? bytes : other)).message!, /determinism/u);
});

test("fuzz options have bounded budgets and versioned checksum replay, with no arbitrary seed paths", () => {
  assert.equal(seeds("fixtures").length, 2);
  assert.equal(seeds("corpus").length, 30);
  assert.equal(seeds("all").length, 32);
  for (const args of [
    ["--cases", "0"],
    ["--cases", "2001"],
    ["--seed", "-1"],
    ["--case", "25000"],
    ["--seed", "NaN"],
    ["--cases"],
    ["--cases", "1", "--cases", "2"],
    ["--mutation-version", "2"],
    ["--expected-sha256", "x"],
    ["--worker", "arbitrary.js"],
  ])
    assert.throws(() => options(args));
  assert.throws(() => seeds("unknown"));
  assert.throws(() => seeds("all", "../secret"));
  const replay = options(["--id", source.id, "--case", "11", "--seed", "0xff", "--expected-sha256", source.sha256]);
  assert.equal(replay.cases, 1);
  assert.equal(replay.start, 11);
  assert.equal(replay.seed, 255);
});

test("isolated real parser campaign completes all strategies and validates replay checksums", async () => {
  const config = { seed: 12345, cases: 24, start: 0, timeoutMs: 10000 };
  const result = await campaign(source, "/unused", config);
  assert.equal(result.finding, undefined);
  assert.equal(result.completed, 24);
  assert.equal(result.accepted + result.rejected, 24);
  assert.ok(result.accepted >= 2 && result.rejected > 0);
  assert.equal(Object.keys(result.strategies).length, strategies.length);
  const replay = { ...config, cases: 1, start: 11, expectedSha256: source.sha256 };
  assert.equal((await campaign(source, "/unused", replay)).accepted, 1);
  const wrong = await campaign(source, "/unused", { ...replay, expectedSha256: "0".repeat(64) });
  assert.match(wrong.finding!.message, /SHA-256 mismatch; mutation was not parsed/u);
});

test("watchdog and receipt checks turn hangs, exits and malformed replies into findings", async (t) => {
  const root = await mkdtemp("/tmp/opencode/font-fuzz-worker-tests-");
  t.after(() => rm(root, { recursive: true, force: true }));
  const bodies = [
    "while (true) {}",
    "process.exit(137)",
    "throw new Error('worker exploded')",
    "process.send({type:'result',index:999})",
    `process.send({type:'result',index:0,kind:'bits',bytesSha256:'${source.sha256}',durationMs:0,status:'rejected'})`,
  ];
  for (const [i, body] of bodies.entries()) {
    const file = join(root, `worker-${i}.mjs`);
    await writeFile(
      file,
      `process.send({type:'ready',sourceSha256:${JSON.stringify(source.sha256)}});process.on('message',()=>{${body}});`,
    );
    const result = await campaign(
      source,
      "/unused",
      { seed: 1, cases: 1, start: 0, timeoutMs: 100 },
      pathToFileURL(file),
    );
    assert.ok(result.finding);
    assert.equal(result.finding.index, 0);
    assert.equal(result.completed, 0);
    assert.match(result.finding.message, /deadline|exited|receipt/u);
  }
});
