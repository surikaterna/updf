import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { manifestExample } from "../examples/business/manifest.js";

const directory = resolve(process.argv[2] ?? "artifacts/manifest");
const example = manifestExample();
await mkdir(directory, { recursive: true });
await writeFile(resolve(directory, "updf-manifest.pdf"), example.bytes);
await writeFile(resolve(directory, "validation.json"), `${JSON.stringify(example.metadata, null, 2)}\n`);
console.log(`${example.result.pageCount} pages, ${example.bytes.length} bytes: ${directory}/updf-manifest.pdf`);
