import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import qrcode from "qrcode-generator";
import { BarcodeFormat, decode, rasterize } from "../../tests/fixtures/barcode-decode.js";
import { bundle, type Profile, type Variant } from "./bundles.js";
import { encodeQR } from "../../packages/barcodes/src/qr-encoder/encoder.js";
import { sample } from "./reference.js";
import { vectorPDF } from "./vector.js";

async function checkBundle(profile: Profile, variant: Variant) {
  const output = await bundle(profile, variant);
  const module = await import(`data:text/javascript;base64,${Buffer.from(output.code).toString("base64")}`);
  for (const value of ["A", "https://example.com/ship/12345", sample(95), sample(192)]) {
    if (profile === "qr") assert.equal(decode(await rasterize(module.pdf(value)), BarcodeFormat.QR_CODE), value);
    else if (profile === "encoder") assert.deepEqual(module.encodeQR(value), encodeQR(value));
    else assert.ok(module.qrCode(value).bars.length > 0);
  }
  const { code, ...row } = output;
  await writeFile(`artifacts/qr-experiment/${profile}-${variant}.mjs`, code);
  return row;
}

function timing(operation: (value: string) => void, value: string): number {
  for (let i = 0; i < 20; i++) operation(value);
  const batches: number[] = [];
  for (let batch = 0; batch < 7; batch++) {
    const start = performance.now();
    for (let i = 0; i < 100; i++) operation(value);
    batches.push((performance.now() - start) / 100);
  }
  return batches.sort((a, b) => a - b)[3]!;
}

await mkdir("artifacts/qr-experiment", { recursive: true });
await writeFile(
  "artifacts/qr-experiment/LICENSE.qrcode-generator",
  await readFile("tests/fixtures/qr-baseline/LICENSE.qrcode-generator"),
);
const rows = [];
for (const profile of ["qrGeometry", "qr"] as const)
  for (const variant of ["original", "stripped", "rewrite"] as const) rows.push(await checkBundle(profile, variant));
rows.push(await checkBundle("encoder", "rewrite"));
const timings = [16, 95, 192].map((length) => ({
  length,
  originalMs: timing((value) => {
    const matrix = qrcode(0, "M");
    matrix.addData(value, "Byte");
    matrix.make();
  }, sample(length)),
  rewriteMs: timing((value) => {
    encodeQR(value);
  }, sample(length)),
}));
await writeFile("artifacts/qr-experiment/demo-M.pdf", vectorPDF(encodeQR("https://example.com/ship/12345")));
await writeFile("artifacts/qr-experiment/demo-H.pdf", vectorPDF(encodeQR("https://example.com/ship/12345", "H")));
await writeFile(
  "artifacts/qr-experiment/report.json",
  `${JSON.stringify({ node: process.version, rows, timings }, null, 2)}\n`,
);
console.table(rows.map(({ profile, variant, raw, gzip }) => ({ profile, variant, raw, gzip })));
console.table(timings);
