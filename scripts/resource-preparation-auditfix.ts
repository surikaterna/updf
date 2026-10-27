import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const out = "artifacts/private-preparation-fixed";
await mkdir(out, { recursive: true });
const command = process.argv.slice(2);
if (command.length) {
  const result = spawnSync(command[0]!, command.slice(1), { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const key = command.join(" ").replaceAll(/[^a-zA-Z0-9.-]+/g, "_");
  const label =
    key.length <= 180 ? key : `${key.slice(0, 160)}-${createHash("sha256").update(key).digest("hex").slice(0, 12)}`;
  await writeFile(
    `${out}/${label}.log`,
    `\nCommand: ${command.join(" ")}\nExit: ${result.status}\n${result.stdout ?? ""}${result.stderr ?? ""}`,
    { flag: "a" },
  );
  console.log({
    command,
    status: result.status,
    signal: result.signal,
    error: result.error?.message,
    log: `${out}/${label}.log`,
  });
  process.exit(result.status ?? 1);
}
const before = JSON.parse(await readFile("artifacts/private-preparation-after/preservation.json", "utf8"));
const after = JSON.parse(await readFile(`${out}/preservation.json`, "utf8"));
const owned = [
  "packages/core/src/vdom/data.ts",
  "packages/core/src/vdom/normalize.ts",
  "packages/core/src/vdom/preparation.ts",
  "packages/core/src/vdom/state.ts",
  "packages/core/test/preparation-data.test.ts",
  "packages/layout/test/preparation-data.test.ts",
  "scripts/resource-preparation-auditfix.ts",
  "scripts/resource-preparation-evidence.ts",
  "scripts/resource-preparation-preservation.ts",
  "docs/evidence/resource-preparation-stage.md",
];
const changed = Object.keys(after.hashes).filter((path) => before.hashes[path] !== after.hashes[path]);
assert.deepEqual(changed.sort(), owned.sort());
const entries = changed.map((path) => ({ path, before: before.hashes[path] ?? null, after: after.hashes[path] }));
const fixHash = createHash("sha256").update(JSON.stringify(entries)).digest("hex");
await writeFile(
  `${out}/fix-manifest.json`,
  JSON.stringify({ head: after.head, branch: after.branch, entries, fixHash }, null, 2),
);
console.log({ changed, fixHash });
