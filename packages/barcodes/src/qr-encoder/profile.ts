export type Level = "M" | "H";

// QR Model 2 version 1..10 block parameters; standard facts, cross-checked against qrcode-generator 2.0.4.
const words = [26, 44, 70, 100, 134, 172, 196, 242, 292, 346];
const correction = { M: [10, 16, 26, 18, 24, 16, 18, 22, 22, 26], H: [17, 28, 22, 16, 22, 28, 26, 26, 24, 28] };
const counts = { M: [1, 1, 1, 2, 2, 4, 4, 4, 5, 5], H: [1, 1, 2, 4, 4, 4, 5, 6, 8, 8] };

export function blockProfile(version: number, level: Level) {
  const total = words[version - 1]!;
  const ecc = correction[level][version - 1]!;
  const blocks = counts[level][version - 1]!;
  return { total, ecc, blocks, data: total - ecc * blocks };
}

export function capacity(version: number, level: Level): number {
  return blockProfile(version, level).data - (version < 10 ? 2 : 3);
}

export function selectVersion(value: string, level: Level, version: number, mask: number): number {
  if (typeof value !== "string" || !value.length || value.length > 213 || /[^\x20-\x7e]/u.test(value))
    throw new RangeError("Expected 1..213 printable ASCII characters");
  if (level !== "M" && level !== "H") throw new RangeError("Expected correction M or H");
  if (!Number.isInteger(version) || version < 0 || version > 10) throw new RangeError("Expected version 0..10");
  if (!Number.isInteger(mask) || mask < -1 || mask > 7) throw new RangeError("Expected mask -1..7");
  const chosen = version || Array.from({ length: 10 }, (_, i) => i + 1).find((v) => capacity(v, level) >= value.length);
  if (!chosen || value.length > capacity(chosen, level)) throw new RangeError("Payload exceeds QR capacity");
  return chosen;
}
