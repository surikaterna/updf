import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { alignedPath, protectedAlignment } from "./alignment.js";

interface Entry {
  readonly old: string;
  readonly new: string;
  readonly kind: string;
  readonly sha256: string;
}

const overrides: Readonly<Record<string, string>> = {
  "package.json": "docs/evidence/baseline/legacy-package.json",
  "readme.md": "docs/migration/legacy-readme.md",
  "experimental/declarative/eslint.config.ts": "eslint.config.ts",
  "experimental/declarative/README.md": "docs/evidence/native-poc-readme.md",
  "experimental/declarative/core/bytes.ts": "packages/core/src/core/pdf-writer.ts",
};

function immutable(entry: Entry): boolean {
  return (
    entry.kind === "preserved-roadmap" ||
    entry.kind === "ignored-generated-legacy" ||
    /^(?:src|test)\//u.test(entry.old) ||
    /(?:LICENSE|LiberationSans-Regular\.ttf|liberation-sans\.json|REUSE\.md|EVIDENCE\.md|package-lock\.json)$/u.test(
      entry.old,
    ) ||
    [".babelrc", ".eslintrc", ".npmignore", "index.js", "keytest.html", "readme.md"].includes(entry.old) ||
    entry.old.endsWith("/.gitignore") ||
    entry.old.includes("/tsconfig") ||
    entry.old.endsWith("/package.json") ||
    entry.old === "package.json" ||
    entry.old.endsWith("/README.md")
  );
}

export function reconcile(filename: string) {
  const inventory: { entries: Entry[]; generated: Entry[] } = JSON.parse(readFileSync(filename, "utf8"));
  const entries = [...inventory.entries, ...inventory.generated].map((entry) => {
    const previousTarget = overrides[entry.old] ?? entry.new;
    const target = alignedPath(previousTarget);
    const bytes = readFileSync(target);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const unchanged = sha256 === entry.sha256;
    if (immutable(entry)) {
      const activeConfig =
        /^(?:(?:packages\/(?:core|geometry|svg|fontkit)|examples\/[^/]+)\/(?:package|tsconfig)\.json|tests\/fixtures\/fonts\/README\.md)$/u.test(
          previousTarget,
        );
      const recorded = activeConfig && protectedAlignment(previousTarget, entry.sha256, sha256);
      assert.ok(unchanged || recorded, `Protected file changed without alignment history: ${entry.old} -> ${target}`);
    }
    return {
      old: entry.old,
      new: target,
      kind: entry.kind,
      oldSha256: entry.sha256,
      sha256,
      status: unchanged ? "relocated-byte-identical" : "migration-edit-review-required",
    };
  });
  assert.equal(entries.length, 293);
  assert.equal(new Set(entries.map((entry) => entry.new)).size, 293);
  return {
    total: entries.length,
    unchanged: entries.filter((entry) => entry.status === "relocated-byte-identical").length,
    transformed: entries.filter((entry) => entry.status !== "relocated-byte-identical").length,
    entries,
  };
}

export function writeReconciliation(filename: string, output: string): void {
  const result = reconcile(filename);
  writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(
    `Accounted ${result.total}: ${result.unchanged} byte-identical, ${result.transformed} explicit migration edits.`,
  );
}
