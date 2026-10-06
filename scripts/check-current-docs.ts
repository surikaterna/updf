import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

const root = process.cwd();
const ignored = new Set(["node_modules", "dist", "artifacts", ".git", "trees", "archive", "archives"]);
async function markdown(directory: string): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name) || entry.name.startsWith("dist-")) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await markdown(path)));
    else if (entry.name.endsWith(".md")) result.push(path);
  }
  return result;
}
function historical(path: string): boolean {
  return (
    path.startsWith("docs/evidence/") ||
    path.startsWith("packages/legacy/") ||
    path === "docs/migration/legacy-readme.md" ||
    (path.startsWith("docs/roadmap/") && path !== "docs/roadmap/current.md" && path !== "docs/roadmap/README.md")
  );
}
async function brokenLinks(path: string, text: string): Promise<string[]> {
  const broken: string[] = [];
  for (const match of text.matchAll(/\[[^\]]*\]\(([^\s)]+)\)/gu)) {
    const target = match[1];
    if (!target || /^(?:https?:|mailto:|#)/u.test(target)) continue;
    const file = target.split("#")[0];
    if (!file) continue;
    try {
      await stat(resolve(dirname(path), decodeURIComponent(file)));
    } catch {
      broken.push(target);
    }
  }
  return broken;
}
const reports = [];
for (const path of (await markdown(root)).sort()) {
  const name = relative(root, path);
  if (historical(name)) continue;
  const text = await readFile(path, "utf8");
  const broken = await brokenLinks(path, text);
  reports.push({ path: name, sha256: createHash("sha256").update(text).digest("hex"), broken });
}
await mkdir("artifacts/jpeg-resources", { recursive: true });
await writeFile("artifacts/jpeg-resources/current-docs.json", `${JSON.stringify(reports, null, 2)}\n`);
assert.deepEqual(
  reports.filter(({ broken }) => broken.length),
  [],
  "Broken current-document local file links",
);
console.log(
  `${reports.length} current Markdown files: local inline file links pass (anchors, external URLs and historical documents not checked).`,
);
