import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { invoiceExample } from "../examples/business/invoice.js";

const directory = resolve(process.argv[2] ?? "artifacts/invoice");
const example = invoiceExample();
await mkdir(directory, { recursive: true });
await writeFile(resolve(directory, "updf-invoice.pdf"), example.bytes);
await writeFile(resolve(directory, "validation.json"), `${JSON.stringify(example.metadata, null, 2)}\n`);
console.log(`${example.result.pageCount} pages, ${example.bytes.length} bytes: ${directory}/updf-invoice.pdf`);
