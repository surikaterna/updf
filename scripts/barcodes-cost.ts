import { mkdir, readFile, writeFile } from "node:fs/promises";
import { barcodeProfile, profiles } from "./consumer/barcode-cost.js";

await mkdir("artifacts/barcodes", { recursive: true });
await writeFile(
  "artifacts/barcodes/LICENSE.qrcode-generator",
  await readFile("packages/barcodes/LICENSE.qrcode-generator"),
);
const report = [];
for (const name of Object.keys(profiles) as (keyof typeof profiles)[]) {
  const { code, ...row } = await barcodeProfile(name);
  await writeFile(`artifacts/barcodes/${name}.mjs`, code);
  report.push(row);
}
await writeFile("artifacts/barcodes/costs.json", `${JSON.stringify(report, null, 2)}\n`);
console.table(report.map(({ name, raw, gzip }) => ({ name, raw, gzip })));
