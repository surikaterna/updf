import assert from "node:assert/strict";
import { prepareFont } from "@updf/fontkite";
import { check, hash } from "./check.js";
import { context, mutate } from "./mutations.js";
import { loadSeed, seeds } from "./sources.js";

async function start(): Promise<void> {
  const [id, cache] = process.argv.slice(2);
  assert.ok(id && cache && process.send, "Worker requires source, cache and IPC");
  const source = seeds("all", id)[0]!,
    bytes = await loadSeed(source, cache);
  const baseline = hash(JSON.stringify(prepareFont(bytes).metadata)),
    data = context(bytes);
  assert.equal(hash(bytes), source.sha256, "Baseline preparation mutated its input");
  process.on("message", (message) => {
    assert.ok(message && typeof message === "object" && "seed" in message && "index" in message);
    assert.ok(typeof message.seed === "number" && typeof message.index === "number");
    const started = performance.now(),
      mutation = mutate(bytes, data, message.seed, message.index);
    const bytesSha256 = hash(mutation.bytes);
    const expected = "expectedSha256" in message ? message.expectedSha256 : undefined;
    const outcome =
      expected !== undefined && expected !== bytesSha256
        ? { status: "finding", message: "Replay input SHA-256 mismatch; mutation was not parsed" }
        : check(mutation.bytes, mutation.kind === "control" ? baseline : undefined);
    process.send?.({
      type: "result",
      index: message.index,
      kind: mutation.kind,
      bytesSha256,
      durationMs: performance.now() - started,
      ...outcome,
    });
  });
  process.send({ type: "ready", sourceSha256: source.sha256, baselineDigest: baseline });
}
start().catch((error) => {
  process.send?.({ type: "seed-error", message: String(error).slice(0, 1500) });
  process.disconnect?.();
});
