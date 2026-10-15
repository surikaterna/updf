import type { PreparedBlock } from "./protocol.js";

const fixedProducers = new WeakSet<PreparedBlock>();

export function registerFixedProducer(block: PreparedBlock): PreparedBlock {
  fixedProducers.add(block);
  return block;
}

export function isFixedProducer(block: PreparedBlock): boolean {
  return fixedProducers.has(block);
}
