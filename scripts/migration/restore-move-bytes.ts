import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { alignedPath } from "./alignment.js";

const inventory: { entries: { old: string; new: string; sha256: string }[] } = JSON.parse(
  readFileSync("docs/evidence/migration-inventory.json", "utf8"),
);
const overrides: Readonly<Record<string, string>> = {
  "package.json": "docs/evidence/baseline/legacy-package.json",
  "readme.md": "docs/migration/legacy-readme.md",
  "experimental/declarative/README.md": "docs/evidence/native-poc-readme.md",
  "experimental/declarative/eslint.config.ts": "docs/evidence/baseline/retired-root-eslint.config.ts.txt",
};
const hash = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
let restored = 0;
for (const entry of inventory.entries) {
  const target = alignedPath(overrides[entry.old] ?? entry.new);
  if (!existsSync(target)) continue;
  const bytes = readFileSync(target);
  if (hash(bytes) === entry.sha256) continue;
  const crlf = Buffer.from(bytes.toString("utf8").replace(/\r?\n/gu, "\r\n"));
  const candidates = [
    bytes,
    bytes.subarray(0, -1),
    crlf,
    crlf.subarray(0, -2),
    Buffer.concat([bytes, Buffer.from("\n")]),
    Buffer.concat([bytes, Buffer.from("\n\n")]),
    Buffer.concat([crlf, Buffer.from("\r\n")]),
    Buffer.concat([crlf, Buffer.from("\r\n\r\n")]),
  ];
  // Text patch moves normalize EOL/EOF. Restore only an exact original hash match.
  const original = candidates.find((candidate) => hash(candidate) === entry.sha256);
  if (!original) continue;
  writeFileSync(target, original);
  restored++;
}
console.log(`Restored ${restored} exact original EOF byte sequences; no content guessed.`);
