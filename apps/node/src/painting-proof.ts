import { mkdir, writeFile } from "node:fs/promises";
import { render } from "@updf/core";
import { paintingDocument } from "./painting-document.js";

const artifacts = new URL("../../../artifacts/", import.meta.url);
await mkdir(artifacts, { recursive: true });
await writeFile(new URL("painting-proof.pdf", artifacts), render(paintingDocument));
