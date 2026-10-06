import { readFile, writeFile } from "node:fs/promises";
import { render } from "@updf/core";
import { jpeg, jpegProvider, prepareJpeg } from "@updf/jpeg";

const source = process.argv[2] ?? "tests/fixtures/jpeg/color-1x1.jpg";
const output = process.argv[3] ?? "artifacts/jpeg-example.pdf";
const photo = prepareJpeg(new Uint8Array(await readFile(source)));
const box = { x: 20, y: 20, width: 160, height: 120 };
const bytes = render(
  {
    version: 1,
    pages: [
      { width: 200, height: 160, children: [jpeg("photo", box)] },
      { width: 200, height: 160, children: [jpeg("alias", box)] },
    ],
  },
  { resources: { photo, alias: photo }, providers: [jpegProvider()] },
);
await writeFile(output, bytes);
console.log({ source, output, metadata: photo.metadata, pdfBytes: bytes.length });
