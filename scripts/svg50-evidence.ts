import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { collectEvidenceHashes, evidenceArtifacts } from "./svg50-evidence-hashes.js";

const label = process.argv[2];
if (label !== "154" && label !== "152") throw new Error("Expected browser evidence label 154 or 152");
const artifacts = new URL("../artifacts/", import.meta.url);
const destination = new URL(`../docs/evidence/svg50/${label}/`, import.meta.url);
await mkdir(destination, { recursive: true });
execFileSync("pdftoppm", [
  "-r",
  "144",
  "-singlefile",
  "-png",
  new URL("svg-signature.pdf", artifacts).pathname,
  new URL("signature-splash", destination).pathname,
]);
for (const name of evidenceArtifacts) {
  const bytes = await readFile(new URL(name, artifacts));
  await writeFile(new URL(name, destination), bytes);
}
const hashes = await collectEvidenceHashes(destination);
const command = (program: string, args: string[]) => execFileSync(program, args, { encoding: "utf8" }).trim();
const poppler = spawnSync("pdftocairo", ["-v"], { encoding: "utf8" });
if (poppler.status !== 0) throw new Error("Unable to record Poppler version");
await writeFile(
  new URL("manifest.json", destination),
  `${JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      cwd: process.cwd(),
      head: command("git", ["rev-parse", "HEAD"]),
      branch: command("git", ["branch", "--show-current"]),
      node: process.version,
      qpdf: command("qpdf", ["--version"]),
      poppler: (poppler.stdout + poppler.stderr).trim(),
      hashes,
    },
    null,
    2,
  )}\n`,
);
