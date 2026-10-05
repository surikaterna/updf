import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cp, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { collectEvidenceHashes } from "../../scripts/svg50-evidence-hashes.js";

const splashHash = "a1b617fc952c088b7650f48b397baec80779431bcc479e2f40bc1a91cabc2b17";
const snapshot = (label: string) => new URL(`../../docs/evidence/svg50/${label}/`, import.meta.url);

for (const label of ["152", "154"]) {
  test(`SVG #50 ${label} manifest covers every persisted artifact with its exact digest`, async () => {
    const directory = snapshot(label);
    const manifest = JSON.parse(await readFile(new URL("manifest.json", directory), "utf8"));
    const hashes = await collectEvidenceHashes(directory);
    const files = (await readdir(directory)).filter((name) => name !== "manifest.json").sort();
    assert.deepEqual(Object.keys(hashes).sort(), files);
    assert.deepEqual(hashes, manifest.hashes);
    assert.equal(hashes["signature-splash.png"], splashHash);
    for (const name of files) {
      const bytes = await readFile(new URL(name, directory));
      assert.equal(manifest.hashes[name], createHash("sha256").update(bytes).digest("hex"), name);
    }
  });
}

test("SVG #50 hash collection exposes corruption of the retained Splash artifact", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "svg50-evidence-"));
  const directory = pathToFileURL(`${temporary}/`);
  try {
    await cp(snapshot("154"), temporary, { recursive: true });
    const original = await collectEvidenceHashes(directory);
    const splash = new URL("signature-splash.png", directory);
    const bytes = await readFile(splash);
    bytes[0] = (bytes[0] ?? 0) ^ 1;
    await writeFile(splash, bytes);
    const corrupted = await collectEvidenceHashes(directory);
    assert.equal(original["signature-splash.png"], splashHash);
    assert.notEqual(corrupted["signature-splash.png"], original["signature-splash.png"]);
    delete original["signature-splash.png"];
    delete corrupted["signature-splash.png"];
    assert.deepEqual(corrupted, original);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
