import { DocumentError } from "@updf/core";
import { PNG_SOURCE_LIMIT, type PngNormalizationSource, type PngSignal } from "@updf/png/normalization";
import { active, hostResult } from "./browser-png-await.js";
import { browserHost, encode, platform, type Bitmap, type Canvas, type HostBlob } from "./browser-png-host.js";

function dimensions(bitmap: Bitmap, source: PngNormalizationSource): void {
  const { width, height } = bitmap;
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    width !== source.metadata.width ||
    height !== source.metadata.height
  )
    throw new DocumentError("PNG_DATA", "/source", "Browser decoded unexpected PNG dimensions");
}

async function outputBytes(blob: HostBlob, signal?: PngSignal): Promise<Uint8Array> {
  active(signal);
  const { size, type } = blob;
  if (type !== "image/png" || !Number.isSafeInteger(size) || size <= 0)
    throw new DocumentError("PNG_DATA", "/source", "Browser returned an invalid PNG blob");
  if (size > PNG_SOURCE_LIMIT) throw new DocumentError("LIMIT", "/source", "Browser PNG exceeds source limit");
  const buffer = await hostResult(blob.arrayBuffer(), signal);
  active(signal);
  const bytes = new Uint8Array(buffer);
  if (bytes.byteLength !== size) throw new DocumentError("PNG_DATA", "/source", "Browser PNG blob size changed");
  return bytes;
}

export async function browserPngBytes(source: PngNormalizationSource, signal?: PngSignal): Promise<Uint8Array> {
  active(signal);
  const host = browserHost();
  let bitmap: Bitmap | undefined;
  let canvas: Canvas | undefined;
  try {
    bitmap = await hostResult(host.decode(host.blob(source.bytes)), signal, (late) => late.close());
    active(signal);
    dimensions(bitmap, source);
    canvas = host.canvas(source.metadata.width, source.metadata.height);
    if (canvas.width !== source.metadata.width) canvas.width = source.metadata.width;
    if (canvas.height !== source.metadata.height) canvas.height = source.metadata.height;
    const context = canvas.getContext("2d", { alpha: true, colorSpace: "srgb" });
    if (!context) platform("Browser canvas has no alpha-enabled 2D context");
    context.drawImage(bitmap, 0, 0);
    active(signal);
    const blob = await hostResult(encode(canvas), signal);
    active(signal);
    return await outputBytes(blob, signal);
  } catch (error) {
    if (error instanceof DocumentError) throw error;
    return platform("Browser PNG decode, drawing or encoding failed");
  } finally {
    bitmap?.close();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
