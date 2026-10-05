import { decimal, isScalar, name, type PdfScalar, value } from "./pdf-values.js";
import { checkLimit } from "./policy.js";

const referenceBrand: unique symbol = Symbol("PDF reference");
export interface PdfRef {
  readonly [referenceBrand]: true;
}
export type PdfValue = PdfScalar | PdfRef | number | boolean | null | readonly PdfValue[] | PdfDictionary;
export interface PdfDictionary {
  readonly [key: string]: PdfValue;
}
type Chunk = string | Uint8Array;
const size = (chunk: Chunk): number => (typeof chunk === "string" ? chunk.length : chunk.byteLength);
const header = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";

/** Document-local handles; definitions snapshot values and stream bytes before returning. */
export class PdfWriter {
  private readonly ids = new Map<PdfRef, number>();
  private readonly bodies: (readonly Chunk[] | undefined)[] = [];
  private length = header.length;
  private sealed = false;

  constructor(private readonly maximum = Number.MAX_SAFE_INTEGER) {}

  reserve(): PdfRef {
    this.open();
    const ref = Object.freeze({ [referenceBrand]: true } as const);
    const id = this.bodies.length + 1;
    const next = this.length + `${id} 0 obj\n\nendobj\n`.length;
    this.check(next, id + 1);
    this.ids.set(ref, id);
    this.bodies.push(undefined);
    this.length = next;
    return ref;
  }

  add(input: PdfValue): PdfRef {
    const ref = this.reserve();
    this.define(ref, input);
    return ref;
  }

  define(ref: PdfRef, input: PdfValue): void {
    this.available(ref);
    this.store(ref, [this.encode(input, new Set(), 0)]);
  }

  defineStream(ref: PdfRef, chunks: readonly Chunk[], dictionary: PdfDictionary = {}): void {
    this.available(ref);
    if (Object.hasOwn(dictionary, "Length")) throw new Error("Automatic PDF stream Length cannot be overridden");
    const length = chunks.reduce((sum, chunk) => sum + size(chunk), 0);
    for (const chunk of chunks) {
      if (typeof chunk === "string" && /[\u0100-\uffff]/.test(chunk)) throw new Error("Expected PDF stream bytes");
    }
    const prefix = `${this.encode({ Length: length, ...dictionary }, new Set(), 0)}\nstream\n`;
    // Budget includes framing, metadata and xref before any binary snapshot allocation.
    this.check(this.length + prefix.length + length + "endstream".length);
    const owned = chunks.map((chunk) => (typeof chunk === "string" ? chunk : new Uint8Array(chunk)));
    this.store(ref, [prefix, ...owned, "endstream"]);
  }

  seal(root: PdfRef): Uint8Array<ArrayBuffer> {
    this.open();
    const rootId = this.id(root);
    if (this.bodies.some((body) => body === undefined)) throw new Error("Unresolved PDF reference");
    const chunks: Chunk[] = [header];
    const offsets: number[] = [];
    let cursor = header.length;
    this.bodies.forEach((body, index) => {
      offsets.push(cursor);
      const parts = [`${index + 1} 0 obj\n`, ...(body ?? []), "\nendobj\n"];
      for (const part of parts) chunks.push(part);
      cursor += parts.reduce((sum, chunk) => sum + size(chunk), 0);
    });
    chunks.push(this.tail(cursor, rootId, offsets));
    const length = chunks.reduce((sum, chunk) => sum + size(chunk), 0);
    this.limit(length);
    this.sealed = true;
    return join(chunks, length);
  }

  private open(): void {
    if (this.sealed) throw new Error("PDF writer is sealed");
  }

  private id(ref: PdfRef): number {
    const id = this.ids.get(ref);
    if (id === undefined) throw new Error("Foreign or invalid PDF reference");
    return id;
  }

  private available(ref: PdfRef): number {
    this.open();
    const index = this.id(ref) - 1;
    if (this.bodies[index] !== undefined) throw new Error("Duplicate PDF definition");
    return index;
  }

  private store(ref: PdfRef, chunks: readonly Chunk[]): void {
    const index = this.available(ref);
    const next = this.length + chunks.reduce((sum, chunk) => sum + size(chunk), 0);
    this.check(next);
    this.bodies[index] = chunks;
    this.length = next;
  }

  private limit(length: number): void {
    checkLimit(length, Math.min(this.maximum, 0xffffffff), "", "PDF output bytes");
  }

  private check(length: number, count = this.bodies.length + 1): void {
    const framing = `xref\n0 ${count}\n0000000000 65535 f \ntrailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${length}\n%%EOF\n`;
    this.limit(length + framing.length + (count - 1) * 20);
  }

  private tail(start: number, root: number, offsets: readonly number[]): string {
    const count = this.bodies.length + 1;
    const entries = offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
    return `xref\n0 ${count}\n0000000000 65535 f \n${entries}trailer\n<< /Size ${count} /Root ${root} 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  }

  private encode(input: PdfValue, active: Set<object>, depth: number): string {
    if (input === null) return "null";
    if (typeof input === "number") return decimal(input);
    if (typeof input === "boolean") return String(input);
    if (typeof input !== "object") throw new Error("Invalid internal PDF value");
    if (referenceBrand in input) return `${this.id(input as PdfRef)} 0 R`;
    if (isScalar(input)) return value(input);
    if (depth >= 64 || active.has(input)) throw new Error("Cyclic or too deeply nested PDF value");
    active.add(input);
    const result = Array.isArray(input)
      ? `[${input.map((item) => this.encode(item, active, depth + 1)).join(" ")}]`
      : `<<${Object.entries(input)
          .map(([key, item]) => ` ${value(name(key))} ${this.encode(item, active, depth + 1)}`)
          .join("")} >>`;
    active.delete(input);
    return result;
  }
}

function join(chunks: readonly Chunk[], length: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(length);
  let cursor = 0;
  for (const chunk of chunks) {
    if (typeof chunk !== "string") {
      bytes.set(chunk, cursor);
      cursor += chunk.byteLength;
      continue;
    }
    for (let i = 0; i < chunk.length; i++) bytes[cursor++] = chunk.charCodeAt(i);
  }
  return bytes;
}
