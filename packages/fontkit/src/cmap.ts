import { fail } from "@updf/core/internal";

function grouped(view: DataView, offset: number, length: number, format: number): void {
  const start = format === 8 ? 8204 : 12;
  if (length < start + 4) fail("FONT_FORMAT", "/font/cmap", "Truncated grouped cmap");
  const groups = view.getUint32(offset + start);
  if (groups > 65535 || groups > Math.floor((length - start - 4) / 12))
    fail("LIMIT", "/font/cmap", "cmap group budget/bounds exceeded");
  let count = 0;
  let previous = -1;
  for (let i = 0; i < groups; i++) {
    const at = offset + start + 4 + i * 12;
    const first = view.getUint32(at);
    const last = view.getUint32(at + 4);
    if (first > last || last > 0x10ffff || first <= previous)
      fail("FONT_FORMAT", "/font/cmap", "Invalid/overlapping scalar ranges");
    previous = last;
    count += last - first + 1;
    if (count > 65535) fail("LIMIT", "/font/cmap", "Font inventory exceeds 65535 codepoints");
  }
}

function format4(view: DataView, offset: number, length: number): void {
  if (length < 16) fail("FONT_FORMAT", "/font/cmap", "Truncated format4");
  const doubled = view.getUint16(offset + 6);
  const count = doubled / 2;
  if (!count || doubled % 2 || 16 + count * 8 > length)
    fail("FONT_FORMAT", "/font/cmap", "Invalid format4 segment bounds");
  let previous = -1;
  for (let i = 0; i < count; i++) {
    const end = view.getUint16(offset + 14 + i * 2);
    const start = view.getUint16(offset + 16 + count * 2 + i * 2);
    const at = 16 + count * 6 + i * 2;
    const range = view.getUint16(offset + at);
    if (start > end || start <= previous || (range && (range % 2 || at + range + (end - start + 1) * 2 > length))) {
      fail("FONT_FORMAT", "/font/cmap", "Invalid format4 ranges");
    }
    previous = end;
  }
}

function contiguous(view: DataView, offset: number, length: number, format: number): void {
  const wide = format === 10;
  const header = wide ? 20 : 10;
  if (length < header) fail("FONT_FORMAT", "/font/cmap", "Truncated contiguous cmap");
  const first = wide ? view.getUint32(offset + 12) : view.getUint16(offset + 6);
  const count = wide ? view.getUint32(offset + 16) : view.getUint16(offset + 8);
  if (count > 65535) fail("LIMIT", "/font/cmap", "Font inventory exceeds 65535 codepoints");
  if (header + count * 2 > length || first + count > (wide ? 0x110000 : 0x10000))
    fail("FONT_FORMAT", "/font/cmap", "Contiguous cmap out of bounds");
}

function subtable(view: DataView, offset: number, available: number): void {
  if (available < 6) fail("FONT_FORMAT", "/font/cmap", "Truncated cmap header");
  const format = view.getUint16(offset);
  const wide = [8, 10, 12, 13].includes(format);
  if (wide && available < 16) fail("FONT_FORMAT", "/font/cmap", "Truncated wide cmap");
  const length =
    format === 14 ? view.getUint32(offset + 2) : wide ? view.getUint32(offset + 4) : view.getUint16(offset + 2);
  if (length < 6 || length > available) fail("FONT_FORMAT", "/font/cmap", "cmap length out of bounds");
  if (format === 4) format4(view, offset, length);
  else if ([8, 12, 13].includes(format)) grouped(view, offset, length, format);
  else if (format === 0 && length < 262) fail("FONT_FORMAT", "/font/cmap", "Truncated byte cmap");
  else if (format === 6 || format === 10) contiguous(view, offset, length, format);
  else if (format === 14 && (length < 10 || 10 + view.getUint32(offset + 6) * 11 > length))
    fail("FONT_FORMAT", "/font/cmap", "Truncated variation-selector cmap");
  else if (![0, 4, 6, 8, 10, 12, 13, 14].includes(format))
    fail("FONT_FORMAT", "/font/cmap", `Unsupported cmap format${format}`);
}

export function checkCmap(view: DataView, offset: number, length: number): void {
  if (length < 4 || view.getUint16(offset) !== 0) fail("FONT_FORMAT", "/font/cmap", "Invalid cmap header");
  const count = view.getUint16(offset + 2);
  if (!count || count > 128 || 4 + count * 8 > length) fail("FONT_FORMAT", "/font/cmap", "Invalid cmap directory");
  for (let i = 0; i < count; i++) {
    const relative = view.getUint32(offset + 4 + i * 8 + 4);
    if (relative < 4 + count * 8 || relative >= length) fail("FONT_FORMAT", "/font/cmap", "cmap pointer out of bounds");
    subtable(view, offset + relative, length - relative);
  }
}
