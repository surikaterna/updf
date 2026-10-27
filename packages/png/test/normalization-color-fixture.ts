import { chunk } from "./helpers.js";

export const standard = [31270, 32900, 64000, 33000, 30000, 60000, 15000, 6000];
export function declaration(type: string, values: number[]): Buffer {
  const bytes = Buffer.alloc(values.length * 4);
  values.forEach((value, index) => {
    bytes.writeUInt32BE(value, index * 4);
  });
  return chunk(type, bytes);
}
export const gamma = (value = 45455) => declaration("gAMA", [value]);
export const chrm = (values = standard) => declaration("cHRM", values);
export const srgb = () => chunk("sRGB", Buffer.from([0]));
export function permutations<T>(values: T[]): T[][] {
  if (!values.length) return [[]];
  return values.flatMap((value, index) =>
    permutations(values.filter((_, other) => other !== index)).map((tail) => [value, ...tail]),
  );
}
