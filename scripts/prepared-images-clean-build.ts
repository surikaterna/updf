import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const root = process.cwd();
const directory = await mkdtemp("/tmp/opencode/updf-s5a2-clean-");
const source = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean);
for (const path of source) {
  const target = join(directory, path);
  await mkdir(dirname(target), { recursive: true });
  await cp(path, target);
}
const showcase = `${directory}-showcase`;
const results: { command: string; status: number | null; log: string }[] = [];
function run(command: string, args: string[], env = process.env) {
  const log = join(directory, `validation-${results.length}.log`);
  const result = spawnSync(command, args, { cwd: directory, env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  results.push({ command: [command, ...args].join(" "), status: result.status, log });
  return { log, result };
}
async function check(command: string, args: string[], env?: NodeJS.ProcessEnv) {
  const { log, result } = run(command, args, env);
  await writeFile(log, `${result.stdout ?? ""}\n${result.stderr ?? ""}`);
  await writeFile(
    join(root, process.env.PREPARED_IMAGES_OUT ?? "artifacts/text-flow/prepared-images", "clean-build.json"),
    JSON.stringify({ directory, copiedSources: source.length, zeroInitialDist: true, showcase, results }, null, 2),
  );
  assert.equal(result.status, 0, `${command} failed; see ${log}`);
}
await check("npm", ["ci", "--ignore-scripts", "--no-audit", "--no-fund"]);
await check("npm", ["run", "typecheck"]);
await check("npm", ["run", "build:browser"]);
await check("npm", ["run", "check:graphs"]);
await check("npx", ["vite", "build", "--config", "apps/showcase/vite.config.ts", "--outDir", showcase]);
await check("npm", ["run", "test:browser"], {
  ...process.env,
  SHOWCASE_OUT_DIR: showcase,
});
await check("npm", ["run", "test:showcase"], { ...process.env, SHOWCASE_OUT_DIR: showcase });
console.log({
  directory,
  sourceCount: source.length,
  results,
  lockBytes: (await readFile(join(directory, "package-lock.json"))).length,
});
