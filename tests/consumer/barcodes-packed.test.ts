import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { absent, execute, pack } from "../../scripts/consumer/install.js";
import { typeConsumer } from "../../scripts/consumer/types.js";

async function install(directory: string, destination: string): Promise<void> {
  const tarballs = await Promise.all(
    ["packages/layout-boxes", "packages/core", "packages/barcodes"].map((source) => pack(source, destination)),
  );
  await mkdir(directory);
  await writeFile(join(directory, "package.json"), '{"private":true,"type":"module"}\n');
  execFileSync(
    "npm",
    [
      "install",
      "--offline",
      "--cache",
      join(destination, "empty-cache"),
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      ...tarballs,
    ],
    { cwd: directory, stdio: "pipe" },
  );
}

test("Barcode tarballs install offline and expose portable shared ESM/CommonJS TSX entries", async () => {
  const destination = await mkdtemp("/tmp/opencode/updf-barcode-packs-");
  try {
    const directory = join(destination, "consumer");
    await install(directory, destination);
    await absent(directory, [
      "@updf/svg",
      "@updf/layout",
      "@updf/fonts",
      "@zxing/library",
      "jsqr",
      "qrcode-generator",
      "react",
    ]);
    await typeConsumer(directory, ["barcodes-template.tsx"]);
    await typeConsumer(directory, ["barcodes-template.tsx"], true);
    const result = await execute(
      directory,
      `
      import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
      import { code39, Code39 } from '@updf/barcodes/code39'; import { qrCode, QRCode } from '@updf/barcodes/qr';
      const require = createRequire(import.meta.url);
      assert.equal(require('@updf/barcodes/code39').Code39, Code39);
      assert.equal(require('@updf/barcodes/qr').QRCode, QRCode);
      assert.deepEqual(require('@updf/barcodes/code39').code39('A'), code39('A'));
      assert.deepEqual(require('@updf/barcodes/qr').qrCode('A'), qrCode('A'));
      assert.deepEqual(require('@updf/barcodes/qr').qrCode('A', {errorCorrection:'H'}), qrCode('A', {errorCorrection:'H'}));
      console.log('packed barcodes passed');
    `,
    );
    assert.match(result, /packed barcodes passed/u);
  } finally {
    await rm(destination, { recursive: true, force: true });
  }
});
