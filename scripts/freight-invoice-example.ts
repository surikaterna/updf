import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { freightInvoiceExample } from "../examples/business/freight-invoice.js";
import { freightFontResources } from "../examples/business/freight-invoice-fonts.js";

export async function nodeFreightResources() {
  const root = new URL("../tests/fixtures/fonts/", import.meta.url);
  const bytes = await Promise.all(
    ["Regular", "Bold"].map(
      async (face) => new Uint8Array(await readFile(new URL(`LiberationSans-${face}.ttf`, root))),
    ),
  );
  return freightFontResources(bytes[0]!, bytes[1]!);
}

const directory = resolve(process.argv[2] ?? "artifacts/freight-invoice");
const example = freightInvoiceExample(await nodeFreightResources());
await mkdir(directory, { recursive: true });
await writeFile(resolve(directory, "updf-freight-invoice.pdf"), example.bytes);
await writeFile(resolve(directory, "validation.json"), `${JSON.stringify(example.metadata, null, 2)}\n`);
console.log(`${example.result.pageCount} page, ${example.bytes.length} bytes: ${directory}/updf-freight-invoice.pdf`);
