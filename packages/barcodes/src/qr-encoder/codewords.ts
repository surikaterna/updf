import { blockProfile, type Level } from "./profile.js";
import { generator, remainder } from "./reed-solomon.js";

function append(bits: number[], value: number, length: number): void {
  for (let shift = length - 1; shift >= 0; shift--) bits.push((value >>> shift) & 1);
}

function frame(value: string, version: number, length: number): Uint8Array {
  const bits: number[] = [];
  append(bits, 4, 4);
  append(bits, value.length, version < 10 ? 8 : 16);
  for (let i = 0; i < value.length; i++) append(bits, value.charCodeAt(i), 8);
  append(bits, 0, Math.min(4, length * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const bytes = new Uint8Array(length);
  for (let i = 0; i < bits.length; i++) bytes[i >>> 3] = bytes[i >>> 3]! | (bits[i]! << (7 - (i & 7)));
  for (let i = bits.length / 8; i < length; i++) bytes[i] = (i - bits.length / 8) % 2 ? 0x11 : 0xec;
  return bytes;
}

function interleave(blocks: readonly Uint8Array[]): number[] {
  const result: number[] = [];
  const length = Math.max(...blocks.map((block) => block.length));
  for (let i = 0; i < length; i++) for (const block of blocks) if (i < block.length) result.push(block[i]!);
  return result;
}

export function codewords(value: string, version: number, level: Level): Uint8Array {
  const profile = blockProfile(version, level);
  const data = frame(value, version, profile.data);
  const polynomial = generator(profile.ecc);
  const short = Math.floor(profile.total / profile.blocks) - profile.ecc;
  const shortCount = profile.blocks - (profile.total % profile.blocks);
  const blocks: Uint8Array[] = [];
  let cursor = 0;
  for (let i = 0; i < profile.blocks; i++) {
    const length = short + Number(i >= shortCount);
    blocks.push(data.slice(cursor, cursor + length));
    cursor += length;
  }
  return Uint8Array.from([...interleave(blocks), ...interleave(blocks.map((block) => remainder(block, polynomial)))]);
}
