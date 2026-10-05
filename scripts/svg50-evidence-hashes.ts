import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export const evidenceArtifacts = [
  "svg-signature.pdf",
  "svg-signature.png",
  "svg-native-signature.png",
  "svg-comparison.json",
  "svg-browser-metadata.json",
  "svg50-area.json",
  "svg50-controls.json",
  "svg50-png-black.png",
  "svg50-png-wrong-color.png",
];

export async function collectEvidenceHashes(destination: URL): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};
  for (const name of [...evidenceArtifacts, "signature-splash.png"]) {
    hashes[name] = createHash("sha256")
      .update(await readFile(new URL(name, destination)))
      .digest("hex");
  }
  return hashes;
}
