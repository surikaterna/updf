import { fail, limits } from "./error.js";

export type Chunk = string | Uint8Array;
export type PdfObject = readonly Chunk[];
export const chunkLength = (chunk: Chunk): number => (typeof chunk === "string" ? chunk.length : chunk.byteLength);

export function assemble(objects: readonly PdfObject[]): Uint8Array<ArrayBuffer> {
  const header = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";
  const chunks: Chunk[] = [header];
  const offsets = [0];
  let length = header.length;
  const append = (chunk: Chunk): void => {
    length += chunkLength(chunk);
    if (length > limits.bytes) fail("LIMIT", "", "PDF output exceeds 10 MiB");
    chunks.push(chunk);
  };
  objects.forEach((parts, i) => {
    offsets.push(length);
    append(`${i + 1} 0 obj\n`);
    parts.forEach(append);
    append("\nendobj\n");
  });
  const startxref = length;
  append(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
  for (const offset of offsets.slice(1)) append(`${String(offset).padStart(10, "0")} 00000 n \n`);
  append(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`);
  return join(chunks, length);
}

function join(chunks: readonly Chunk[], length: number): Uint8Array<ArrayBuffer> {
  // Exactly one final allocation after all byte counts and the output cap.
  const bytes = new Uint8Array(length);
  let cursor = 0;
  for (const chunk of chunks) {
    if (typeof chunk !== "string") {
      bytes.set(chunk, cursor);
      cursor += chunk.byteLength;
    } else {
      for (let i = 0; i < chunk.length; i++) bytes[cursor++] = chunk.charCodeAt(i);
    }
  }
  return bytes;
}

export function stream(chunks: readonly Chunk[], extra = ""): PdfObject {
  const length = chunks.reduce((sum, chunk) => sum + chunkLength(chunk), 0);
  return [`<< /Length ${length}${extra} >>\nstream\n`, ...chunks, "endstream"];
}
