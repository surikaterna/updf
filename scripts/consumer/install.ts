import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const root = fileURLToPath(new URL("../../", import.meta.url));

export async function pack(directory: string, destination: string): Promise<string> {
  const result: unknown = JSON.parse(
    execFileSync("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", destination], {
      cwd: join(root, directory),
      encoding: "utf8",
      stdio: "pipe",
    }),
  );
  assert.ok(Array.isArray(result));
  const first: unknown = result[0];
  assert.ok(first && typeof first === "object" && "filename" in first && typeof first.filename === "string");
  return join(destination, first.filename);
}

export async function install(tarballs: readonly string[]): Promise<string> {
  const directory = await mkdtemp("/tmp/opencode/updf-consumer-");
  await writeFile(join(directory, "package.json"), '{"private":true,"type":"module"}\n');
  execFileSync("npm", ["install", "--ignore-scripts", "--omit=dev", "--no-audit", "--no-fund", ...tarballs], {
    cwd: directory,
    stdio: "pipe",
  });
  return directory;
}

export async function absent(directory: string, names: readonly string[]): Promise<void> {
  for (const name of names) {
    await assert.rejects(readFile(join(directory, "node_modules", name, "package.json")));
  }
}

export async function execute(directory: string, source: string): Promise<string> {
  const filename = join(directory, "runtime.mjs");
  await writeFile(filename, source);
  return execFileSync(process.execPath, [filename], { cwd: directory, encoding: "utf8", stdio: "pipe" });
}
