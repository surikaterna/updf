import { DocumentError } from "@updf/core";
import { checkAbort, type PngSignal } from "./options.js";

interface Reader {
  read(): Promise<{ done: boolean; value?: Uint8Array }>;
  cancel(): Promise<void>;
  releaseLock(): void;
}
interface Writer {
  write(bytes: Uint8Array): Promise<void>;
  close(): Promise<void>;
  abort(): Promise<void>;
  releaseLock(): void;
}
interface CodecStream {
  readable: { getReader(): Reader };
  writable: { getWriter(): Writer };
}
type Direction = "CompressionStream" | "DecompressionStream";
const host = globalThis as unknown as Partial<Record<Direction, new (format: "deflate") => CodecStream>>;

function codec(direction: Direction): CodecStream {
  if (!host.CompressionStream || !host.DecompressionStream)
    throw new DocumentError("PNG_PLATFORM", "/source", "PNG requires native CompressionStream and DecompressionStream");
  try {
    return new host[direction]!("deflate");
  } catch {
    throw new DocumentError("PNG_PLATFORM", "/source", "Native deflate compression streams are unavailable");
  }
}

async function feed(writer: Writer, bytes: Uint8Array, signal?: PngSignal): Promise<void> {
  // Small input writes limit each expansion burst; native buffering remains host-owned.
  for (let offset = 0; offset < bytes.length; offset += 1024) {
    checkAbort(signal);
    await writer.write(bytes.subarray(offset, offset + 1024));
  }
  await writer.close();
}

async function collect(reader: Reader, maximum: number, signal?: PngSignal): Promise<Uint8Array> {
  let buffer = new Uint8Array(Math.min(maximum, 16384)),
    size = 0;
  for (let reads = 0; ; reads++) {
    checkAbort(signal);
    if (reads >= 65536) throw new DocumentError("LIMIT", "/source", "PNG codec exceeds stream read limit");
    const { done, value } = await reader.read();
    if (done) return buffer.slice(0, size);
    if (!value || size + value.length > maximum)
      throw new DocumentError("PNG_DATA", "/source", "PNG codec output exceeds expected size bound");
    if (size + value.length > buffer.length) {
      const grown = new Uint8Array(Math.min(maximum, Math.max(size + value.length, buffer.length * 2)));
      grown.set(buffer.subarray(0, size));
      buffer = grown;
    }
    buffer.set(value, size);
    size += value.length;
  }
}

function cleanup(reader: Reader, writer: Writer): void {
  // Neither cleanup failures nor unfinished native work may hide the original outcome.
  for (const close of [() => reader.cancel(), () => writer.abort()]) {
    try {
      void close().catch(() => {});
    } catch {}
  }
  for (const release of [() => reader.releaseLock(), () => writer.releaseLock()]) {
    try {
      release();
    } catch {}
  }
}

export async function transcode(
  bytes: Uint8Array,
  maximum: number,
  direction: Direction,
  signal?: PngSignal,
): Promise<Uint8Array> {
  checkAbort(signal);
  const stream = codec(direction),
    reader = stream.readable.getReader(),
    writer = stream.writable.getWriter();
  let abort = () => {};
  const cancelled = new Promise<never>((_resolve, reject) => {
    abort = () => reject(new DocumentError("PNG_ABORT", "/source", "PNG preparation was aborted"));
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
  });
  try {
    const work = Promise.all([collect(reader, maximum, signal), feed(writer, bytes, signal)]);
    const [result] = await Promise.race([work, cancelled]);
    checkAbort(signal);
    return result;
  } catch (error) {
    if (error instanceof DocumentError) throw error;
    throw new DocumentError(
      direction === "DecompressionStream" ? "PNG_DATA" : "PNG_PLATFORM",
      "/source",
      direction === "DecompressionStream" ? "Invalid PNG zlib stream" : "Native PNG compression failed",
    );
  } finally {
    signal?.removeEventListener("abort", abort);
    cleanup(reader, writer);
  }
}
