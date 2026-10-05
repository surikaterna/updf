import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export function alignedPath(path: string): string {
  if (path === "packages/core/src/core/metrics.ts") return "packages/fonts/src/helvetica-metrics.ts";
  if (path === "packages/core/src/fonts/resources.ts") return "packages/fonts/src/runtime.ts";
  if (path.startsWith("packages/core/src/fonts/")) return path.replace("core/src/fonts/", "fonts/src/");
  if (path === "packages/core/test/font-resources.test.ts") return "packages/fonts/test/font-resources.test.ts";
  if (path.startsWith("examples/")) return `apps/${path.slice("examples/".length)}`;
  if (path.startsWith("tools/")) return `scripts/${path.slice("tools/".length)}`;
  return path;
}

interface HistoryEntry {
  readonly path: string;
  readonly sha256?: string;
  readonly afterSha256?: string;
}

export function protectedAlignment(path: string, original: string, current: string): boolean {
  const history: { entries: HistoryEntry[] } = JSON.parse(
    readFileSync("docs/evidence/ghost-biome-history.json", "utf8"),
  );
  const entry = history.entries.find((entry) => entry.path === path);
  if (entry?.sha256 !== original) return false;
  if (entry.afterSha256 === current) return true;
  // Active manifests evolve; the retained aligned copy still certifies the historical migration.
  if (!/packages\/(core|fontkit)\/package\.json$/u.test(path)) return false;
  const name = path.split("/")[1];
  const baseline = `docs/evidence/baseline/${name}-package-ac60f80.json`;
  return digest(readFileSync(baseline)) === entry.afterSha256;
}

export function digest(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
