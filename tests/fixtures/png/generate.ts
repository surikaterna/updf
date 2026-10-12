import { writeFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";
import { pathToFileURL } from "node:url";

function chunk(type: string, data: Uint8Array): Buffer {
  const bytes = Buffer.alloc(data.length + 12);
  bytes.writeUInt32BE(data.length);
  bytes.write(type, 4, "ascii");
  bytes.set(data, 8);
  let crc = 0xffffffff;
  for (const byte of bytes.subarray(4, -4)) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  bytes.writeUInt32BE((crc ^ 0xffffffff) >>> 0, bytes.length - 4);
  return bytes;
}

/** Original asymmetric artwork: opaque red/gold, half-transparent green, clear blue. */
export function samplePng(gray = false): Buffer {
  const width = 32,
    height = 24,
    channels = gray ? 2 : 4;
  const rows = Buffer.alloc((width * channels + 1) * height);
  const colors = [
    [230, 30, 20, 255],
    [20, 210, 40, 128],
    [30, 40, 220, 0],
    [240, 220, 30, 255],
  ];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = colors[(y < 12 ? 0 : 2) + (x < 16 ? 0 : 1)]!;
      const offset = y * (width * channels + 1) + 1 + x * channels;
      const pixel = gray ? [Math.round((color[0]! + color[1]! + color[2]!) / 3), color[3]!] : color;
      rows.set(pixel, offset);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = gray ? 4 : 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", new Uint8Array()),
  ]);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await writeFile(new URL("color-alpha.png", import.meta.url), samplePng());
  await writeFile(new URL("gray-alpha.png", import.meta.url), samplePng(true));
}
