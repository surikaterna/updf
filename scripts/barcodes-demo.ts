import { mkdir, writeFile } from "node:fs/promises";
import { barcodeExample } from "../examples/barcodes.js";

await mkdir("artifacts/barcodes", { recursive: true });
await writeFile("artifacts/barcodes/demo.pdf", barcodeExample());
console.log("Wrote artifacts/barcodes/demo.pdf (Code 39, Mod-43 Code 39 and two QR symbols)");
