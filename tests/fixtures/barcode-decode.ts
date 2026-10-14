import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import {
  BarcodeFormat,
  BinaryBitmap,
  Code39Reader,
  DecodeHintType,
  HybridBinarizer,
  RGBLuminanceSource,
} from "@zxing/library";

const jsQR = createRequire(import.meta.url)("jsqr") as typeof import("jsqr").default;

export { BarcodeFormat } from "@zxing/library";

export interface Raster {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
}

export async function rasterize(bytes: Uint8Array, dpi = 216): Promise<Raster> {
  const directory = await mkdtemp("/tmp/opencode/updf-barcode-raster-");
  try {
    const filename = join(directory, "symbol.pdf");
    await writeFile(filename, bytes);
    execFileSync("qpdf", ["--check", filename], { stdio: "pipe" });
    const pgm = execFileSync("pdftoppm", ["-gray", "-r", String(dpi), "-singlefile", filename], {
      maxBuffer: 32 * 1024 * 1024,
    });
    const header = /^P5\s+(\d+)\s+(\d+)\s+255\s/u.exec(pgm.subarray(0, 80).toString("ascii"));
    assert.ok(header);
    const width = Number(header[1]),
      height = Number(header[2]);
    const pixels = new Uint8ClampedArray(pgm.subarray(header[0].length));
    assert.equal(pixels.length, width * height);
    return { width, height, pixels };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export function decode(raster: Raster, format: BarcodeFormat, checksum = false): string {
  if (format === BarcodeFormat.QR_CODE) return decodeQR(raster);
  const source = new RGBLuminanceSource(raster.pixels, raster.width, raster.height);
  const hints = new Map<DecodeHintType, unknown>([
    [DecodeHintType.POSSIBLE_FORMATS, [format]],
    [DecodeHintType.TRY_HARDER, true],
  ]);
  if (checksum) hints.set(DecodeHintType.ASSUME_CODE_39_CHECK_DIGIT, true);
  const reader = new Code39Reader(checksum, false);
  return reader.decode(new BinaryBitmap(new HybridBinarizer(source)), hints).getText();
}

function decodeQR(raster: Raster): string {
  const rgba = new Uint8ClampedArray(raster.pixels.length * 4);
  for (let i = 0; i < raster.pixels.length; i++) {
    const gray = raster.pixels[i]!;
    rgba.set([gray, gray, gray, 255], i * 4);
  }
  const result = jsQR(rgba, raster.width, raster.height);
  assert.ok(result, "Independent QR detector/decoder did not find a symbol");
  return result.data;
}
