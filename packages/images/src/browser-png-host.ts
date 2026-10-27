import { DocumentError } from "@updf/core";

export interface HostBlob {
  readonly size: number;
  readonly type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}
export interface Bitmap {
  readonly width: number;
  readonly height: number;
  close(): void;
}
export interface Canvas {
  width: number;
  height: number;
  getContext(
    kind: "2d",
    options: { alpha: true; colorSpace: "srgb" },
  ): {
    drawImage(bitmap: Bitmap, x: number, y: number): void;
  } | null;
  convertToBlob?: (options: { type: "image/png" }) => Promise<HostBlob>;
  toBlob?: (callback: (blob: HostBlob | null) => void, type: "image/png") => void;
}
interface Host {
  Blob?: new (parts: Uint8Array[], options: { type: "image/png" }) => HostBlob;
  createImageBitmap?: (blob: HostBlob) => Promise<Bitmap>;
  OffscreenCanvas?: new (width: number, height: number) => Canvas;
  document?: { createElement(tag: "canvas"): Canvas };
}

export function platform(message: string): never {
  throw new DocumentError("PNG_PLATFORM", "/source", message);
}

/** Platform capabilities are trusted, not a sandbox; no browser access occurs at module evaluation. */
export function browserHost() {
  const host: Host = {};
  for (const key of ["Blob", "createImageBitmap", "OffscreenCanvas", "document"] as const) {
    if (Object.hasOwn(globalThis, key)) Object.assign(host, { [key]: Reflect.get(globalThis, key) });
  }
  if (typeof host.Blob !== "function" || typeof host.createImageBitmap !== "function")
    platform("16-bit PNG conversion requires browser Blob and createImageBitmap");
  if (typeof host.OffscreenCanvas !== "function" && typeof host.document?.createElement !== "function")
    platform("16-bit PNG conversion requires a browser canvas");
  return {
    blob: (bytes: Uint8Array) => new host.Blob!([bytes], { type: "image/png" }),
    decode: (blob: HostBlob) => host.createImageBitmap!.call(globalThis, blob),
    canvas(width: number, height: number): Canvas {
      if (typeof host.OffscreenCanvas === "function" && host.OffscreenCanvas.prototype.convertToBlob)
        return new host.OffscreenCanvas(width, height);
      if (!host.document) platform("16-bit PNG conversion requires a PNG-encoding canvas");
      return host.document.createElement("canvas");
    },
  };
}

export function encode(canvas: Canvas): Promise<HostBlob> {
  if (typeof canvas.convertToBlob === "function") return canvas.convertToBlob({ type: "image/png" });
  if (typeof canvas.toBlob !== "function") platform("Browser canvas cannot encode PNG");
  return new Promise((resolve, reject) => {
    canvas.toBlob!((blob) => {
      if (blob) resolve(blob);
      else reject(new DocumentError("PNG_PLATFORM", "/source", "Browser canvas returned no PNG"));
    }, "image/png");
  });
}
