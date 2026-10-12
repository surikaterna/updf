import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Compare actual PDF objects and decoded streams, not host-specific DEFLATE encodings. */
export function canonicalPngPdf(bytes: Uint8Array): Buffer {
  const directory = mkdtempSync(join(tmpdir(), "updf-png-equivalence-"));
  try {
    const path = join(directory, "input.pdf");
    writeFileSync(path, bytes);
    execFileSync("qpdf", ["--check", path]);
    return execFileSync(
      "qpdf",
      ["--qdf", "--object-streams=disable", "--stream-data=uncompress", "--static-id", path, "-"],
      { maxBuffer: 16 * 1024 * 1024 },
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
