import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export function alignedPath(path: string): string {
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
  return entry?.sha256 === original && entry.afterSha256 === current;
}

export function digest(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
