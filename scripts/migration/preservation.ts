import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export interface PreservationEntry {
  readonly old: string;
  readonly bytes: number;
  readonly sha256: string;
}

export function entries(input: unknown): readonly PreservationEntry[] {
  if (!input || typeof input !== "object" || !("entries" in input) || !("generated" in input)) {
    throw new Error("Invalid preservation inventory");
  }
  if (!Array.isArray(input.entries) || !Array.isArray(input.generated)) throw new Error("Invalid entry lists");
  return [...input.entries, ...input.generated].map((entry: unknown) => {
    if (!entry || typeof entry !== "object" || !("old" in entry) || !("bytes" in entry) || !("sha256" in entry)) {
      throw new Error("Invalid preservation entry");
    }
    if (typeof entry.old !== "string" || typeof entry.bytes !== "number" || typeof entry.sha256 !== "string") {
      throw new Error("Invalid preservation entry fields");
    }
    return { old: entry.old, bytes: entry.bytes, sha256: entry.sha256 };
  });
}

export function check(entry: PreservationEntry, bytes: Uint8Array): void {
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (bytes.length !== entry.bytes || sha256 !== entry.sha256) throw new Error(`Changed original: ${entry.old}`);
}

export function verify(filename: string): number {
  const inventory: unknown = JSON.parse(readFileSync(filename, "utf8"));
  const all = entries(inventory);
  for (const entry of all) check(entry, readFileSync(entry.old));
  return all.length;
}
